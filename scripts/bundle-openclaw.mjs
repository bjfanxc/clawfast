import fs from 'fs-extra'
import path from 'path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')
const nodeModulesDir = path.join(repoRoot, 'node_modules')
const openClawDir = path.join(nodeModulesDir, 'openclaw')
const outputDir = path.join(repoRoot, 'build', 'openclaw')
const outputNodeModulesDir = path.join(outputDir, 'node_modules')

const visited = new Set()
const missingOptionalDependencies = []

function normalizePath(value) {
  return process.platform === 'win32' ? value.replace(/\//g, '\\') : value
}

function readPackageJson(packageDir) {
  return fs.readJsonSync(path.join(packageDir, 'package.json'))
}

function isMatchingPackageDir(packageDir, specifier) {
  const packageJsonPath = path.join(packageDir, 'package.json')
  if (!fs.existsSync(packageJsonPath)) {
    return false
  }

  try {
    const packageJson = readPackageJson(packageDir)
    return packageJson.name === specifier
  } catch {
    return false
  }
}

function listDependencies(packageJson) {
  return {
    required: Object.keys(packageJson.dependencies ?? {}),
    optional: Object.keys(packageJson.optionalDependencies ?? {}),
  }
}

function resolvePackageDir(specifier, fromDir) {
  let currentDir = fromDir
  const packagePathSegments = specifier.split('/')

  while (currentDir !== path.dirname(currentDir)) {
    const candidateDir = path.join(currentDir, 'node_modules', ...packagePathSegments)
    if (fs.existsSync(path.join(candidateDir, 'package.json'))) {
      return candidateDir
    }

    currentDir = path.dirname(currentDir)
  }

  const requireFromPackage = createRequire(path.join(fromDir, 'package.json'))
  const candidates = [`${specifier}/package.json`, specifier]

  for (const candidate of candidates) {
    try {
      const resolvedPath = requireFromPackage.resolve(candidate)
      let currentDir = path.dirname(resolvedPath)

      while (currentDir !== path.dirname(currentDir)) {
        if (isMatchingPackageDir(currentDir, specifier)) {
          return currentDir
        }

        currentDir = path.dirname(currentDir)
      }
    } catch {
      continue
    }
  }

  return null
}

function mapDestinationDir(packageDir) {
  const normalizedRoot = normalizePath(nodeModulesDir)
  const normalizedOpenClawNodeModules = normalizePath(path.join(openClawDir, 'node_modules'))
  const normalizedPackageDir = normalizePath(packageDir)

  if (normalizedPackageDir.startsWith(normalizedOpenClawNodeModules + path.sep)) {
    return path.join(outputNodeModulesDir, path.relative(normalizedOpenClawNodeModules, normalizedPackageDir))
  }

  if (normalizedPackageDir.startsWith(normalizedRoot + path.sep)) {
    return path.join(outputNodeModulesDir, path.relative(normalizedRoot, normalizedPackageDir))
  }

  throw new Error(`Unsupported package location: ${packageDir}`)
}

function shouldSkipCopy(source) {
  return path.basename(source) === 'node_modules'
}

function copyPackage(sourceDir, destinationDir) {
  fs.copySync(sourceDir, destinationDir, {
    dereference: true,
    overwrite: false,
    errorOnExist: false,
    filter: (source) => !shouldSkipCopy(source),
  })
}

function stageDependency(packageDir) {
  const realPackageDir = fs.realpathSync(packageDir)
  const destinationDir = mapDestinationDir(realPackageDir)
  copyPackage(realPackageDir, destinationDir)
}

function bundleDependency(packageDir) {
  const realPackageDir = fs.realpathSync(packageDir)

  if (visited.has(realPackageDir)) {
    return
  }

  visited.add(realPackageDir)

  const destinationDir = mapDestinationDir(realPackageDir)
  copyPackage(realPackageDir, destinationDir)

  const packageJson = readPackageJson(realPackageDir)
  const { required, optional } = listDependencies(packageJson)

  for (const dependencyName of required) {
    const dependencyDir = resolvePackageDir(dependencyName, realPackageDir)
    if (!dependencyDir) {
      console.warn(`[bundle-openclaw] skip unresolved dependency: ${dependencyName} (from ${realPackageDir})`)
      continue
    }
    bundleDependency(dependencyDir)
  }

  for (const dependencyName of optional) {
    const dependencyDir = resolvePackageDir(dependencyName, realPackageDir)
    if (!dependencyDir) {
      missingOptionalDependencies.push({
        name: dependencyName,
        from: realPackageDir,
      })
      continue
    }
    bundleDependency(dependencyDir)
  }
}

async function main() {
  if (!(await fs.pathExists(openClawDir))) {
    throw new Error('node_modules/openclaw not found. Run npm install first.')
  }

  visited.clear()
  missingOptionalDependencies.length = 0

  const sourcePackageJson = readPackageJson(openClawDir)
  const bundledVersion = sourcePackageJson.version ?? 'unknown'
  await fs.remove(outputDir)
  await fs.ensureDir(outputNodeModulesDir)

  copyPackage(openClawDir, outputDir)

  const { required, optional } = listDependencies(sourcePackageJson)

  for (const dependencyName of required) {
    const dependencyDir = resolvePackageDir(dependencyName, openClawDir)
    if (!dependencyDir) {
      continue
    }
    stageDependency(dependencyDir)
  }

  for (const dependencyName of optional) {
    const dependencyDir = resolvePackageDir(dependencyName, openClawDir)
    if (!dependencyDir) {
      continue
    }
    stageDependency(dependencyDir)
  }

  for (const dependencyName of required) {
    const dependencyDir = resolvePackageDir(dependencyName, openClawDir)
    if (!dependencyDir) {
      console.warn(`[bundle-openclaw] skip unresolved dependency: ${dependencyName} (from openclaw)`)
      continue
    }
    bundleDependency(dependencyDir)
  }

  for (const dependencyName of optional) {
    const dependencyDir = resolvePackageDir(dependencyName, openClawDir)
    if (!dependencyDir) {
      missingOptionalDependencies.push({
        name: dependencyName,
        from: 'openclaw',
      })
      continue
    }
    bundleDependency(dependencyDir)
  }

  console.log(`[bundle-openclaw] bundled openclaw@${bundledVersion} -> ${outputDir}`)

  if (missingOptionalDependencies.length > 0) {
    console.log(
      `[bundle-openclaw] skipped ${missingOptionalDependencies.length} missing optional dependencies for the current platform`,
    )
  }
}

main().catch((error) => {
  console.error('[bundle-openclaw] failed:', error)
  process.exit(1)
})

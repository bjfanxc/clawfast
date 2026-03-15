const fs = require('fs-extra')
const path = require('path')
const os = require('os')
const { spawnSync } = require('child_process')

function getResourcesDir(context) {
  if (context.electronPlatformName === 'darwin') {
    return path.join(context.appOutDir, 'Contents', 'Resources')
  }

  return path.join(context.appOutDir, 'resources')
}

function getCachedRcEditPath() {
  if (process.platform !== 'win32') {
    return null
  }

  const cacheDir = path.join(os.homedir(), 'AppData', 'Local', 'electron-builder', 'Cache', 'winCodeSign')
  if (!fs.existsSync(cacheDir)) {
    return null
  }

  const entries = fs
    .readdirSync(cacheDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(cacheDir, entry.name))
    .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs)

  for (const entry of entries) {
    const candidate = path.join(entry, 'rcedit-x64.exe')
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

function patchWindowsExecutableIcon(context) {
  if (context.electronPlatformName !== 'win32') {
    return
  }

  const rcEditPath = getCachedRcEditPath()
  if (!rcEditPath) {
    console.warn('[after-pack] skipped exe icon patch: rcedit-x64.exe not found in electron-builder cache')
    return
  }

  const exeName = `${context.packager.appInfo.productFilename}.exe`
  const exePath = path.join(context.appOutDir, exeName)
  const iconPath = path.join(context.packager.projectDir, 'resources', 'icons', 'icon.ico')

  if (!fs.existsSync(exePath) || !fs.existsSync(iconPath)) {
    console.warn('[after-pack] skipped exe icon patch: target exe or icon file is missing')
    return
  }

  const result = spawnSync(rcEditPath, [exePath, '--set-icon', iconPath], {
    stdio: 'pipe',
  })

  if (result.status !== 0) {
    const stderr = result.stderr?.toString().trim()
    const stdout = result.stdout?.toString().trim()
    throw new Error(`failed to patch ${exeName} icon${stderr ? `: ${stderr}` : stdout ? `: ${stdout}` : ''}`)
  }

  console.log(`[after-pack] patched Windows exe icon -> ${exePath}`)
}

module.exports = async function afterPack(context) {
  if (process.env.CLAWFAST_BUNDLE_OPENCLAW !== '1') {
    patchWindowsExecutableIcon(context)
    return
  }

  const sourceNodeModulesDir = path.join(context.packager.projectDir, 'build', 'openclaw', 'node_modules')
  const targetNodeModulesDir = path.join(getResourcesDir(context), 'openclaw', 'node_modules')

  if (!(await fs.pathExists(sourceNodeModulesDir))) {
    return
  }

  await fs.ensureDir(path.dirname(targetNodeModulesDir))
  await fs.copy(sourceNodeModulesDir, targetNodeModulesDir, {
    dereference: true,
  })

  console.log(`[after-pack] copied bundled openclaw node_modules -> ${targetNodeModulesDir}`)
  patchWindowsExecutableIcon(context)
}

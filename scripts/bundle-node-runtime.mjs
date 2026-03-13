import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')
const outputDir = path.join(repoRoot, 'build', 'node-runtime')

function getExecutableName() {
  return process.platform === 'win32' ? 'node.exe' : 'node'
}

async function main() {
  await fs.ensureDir(outputDir)

  const sourcePath = process.execPath
  const destinationPath = path.join(outputDir, getExecutableName())

  if (await fs.pathExists(destinationPath)) {
    console.log(`[bundle-node-runtime] reusing runtime ${process.version} -> ${destinationPath}`)
    return
  }

  await fs.copy(sourcePath, destinationPath, {
    dereference: true,
  })

  if (process.platform !== 'win32') {
    await fs.chmod(destinationPath, 0o755)
  }

  console.log(`[bundle-node-runtime] bundled runtime ${process.version} -> ${destinationPath}`)
}

main().catch((error) => {
  console.error('[bundle-node-runtime] failed:', error)
  process.exit(1)
})

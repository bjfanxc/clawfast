import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')

const mode = process.argv[2]

if (!mode || !['admin-only', 'with-openclaw'].includes(mode)) {
  console.error('[prepare-electron-builder-config] expected mode: admin-only | with-openclaw')
  process.exit(1)
}

const sourceFile =
  mode === 'with-openclaw'
    ? path.join(repoRoot, 'electron-builder.openclaw.yml')
    : path.join(repoRoot, 'electron-builder.admin.yml')
const targetFile = path.join(repoRoot, 'electron-builder.yml')

await fs.copy(sourceFile, targetFile, { overwrite: true })
console.log(`[prepare-electron-builder-config] wrote ${path.basename(targetFile)} from ${path.basename(sourceFile)}`)

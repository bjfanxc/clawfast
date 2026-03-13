import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')

const optionalDependencyPaths = [
  path.join(repoRoot, 'node_modules', '@discordjs', 'opus'),
  path.join(repoRoot, 'build', 'openclaw', 'node_modules', '@discordjs', 'opus'),
]

async function main() {
  for (const dependencyPath of optionalDependencyPaths) {
    if (await fs.pathExists(dependencyPath)) {
      await fs.remove(dependencyPath)
      console.log(`[prune-openclaw] removed optional dependency: ${dependencyPath}`)
    }
  }
}

main().catch((error) => {
  console.error('[prune-openclaw] failed:', error)
  process.exit(1)
})

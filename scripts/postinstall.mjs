import { spawnSync } from 'child_process'

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
  })

  if (result.error) {
    console.error(result.error)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

run('node', ['scripts/prune-openclaw-optional-deps.mjs'])
if (process.platform === 'win32') {
  const comspec = process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe'
  run(comspec, ['/d', '/s', '/c', 'npm exec electron-builder -- install-app-deps'])
} else {
  run('npm', ['exec', 'electron-builder', '--', 'install-app-deps'])
}

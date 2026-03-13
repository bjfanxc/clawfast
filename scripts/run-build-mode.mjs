import { spawnSync } from 'child_process'

const args = process.argv.slice(2)
const mode = args[0]
const platformArgs = args.slice(1)

if (!mode || !['admin-only', 'with-openclaw'].includes(mode)) {
  console.error('[run-build-mode] expected mode: admin-only | with-openclaw')
  process.exit(1)
}

const includeBundledOpenClaw = mode === 'with-openclaw'

function run(command, commandArgs, extraEnv = {}) {
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      ...extraEnv,
    },
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

if (includeBundledOpenClaw) {
  run('npm', ['run', 'prune:openclaw'])
  run('npm', ['run', 'bundle:node-runtime'])
  run('npm', ['run', 'bundle:openclaw'])
}

run('node', ['scripts/prepare-electron-builder-config.mjs', mode])

run('npx', ['nextron', 'build', ...platformArgs], {
  CLAWFAST_BUNDLE_OPENCLAW: includeBundledOpenClaw ? '1' : '0',
})

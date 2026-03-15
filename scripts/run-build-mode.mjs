import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'

const args = process.argv.slice(2)
const mode = args[0]
const platformArgs = args.slice(1)

if (!mode || !['admin-only', 'with-openclaw'].includes(mode)) {
  console.error('[run-build-mode] expected mode: admin-only | with-openclaw')
  process.exit(1)
}

const includeBundledOpenClaw = mode === 'with-openclaw'

function writeOutput(text, writer) {
  if (text) {
    writer(text)
  }
}

function findCompletedWindowsInstaller() {
  const distDir = path.join(process.cwd(), 'dist')
  if (!fs.existsSync(distDir)) {
    return null
  }

  const entries = fs.readdirSync(distDir)
  const installerName = entries.find((entry) => /^ClawFast Setup .*\.exe$/i.test(entry))

  if (!installerName) {
    return null
  }

  const installerPath = path.join(distDir, installerName)
  return fs.statSync(installerPath).size > 0 ? installerPath : null
}

function cleanupNsisTempArchive() {
  const archivePath = path.join(process.cwd(), 'dist', 'clawfast-1.0.0-x64.nsis.7z')
  if (!fs.existsSync(archivePath)) {
    return
  }

  spawnSync('cmd', ['/c', 'del', '/f', '/q', archivePath], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  })
}

function run(command, commandArgs, extraEnv = {}) {
  const result = spawnSync(command, commandArgs, {
    stdio: 'pipe',
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      ...extraEnv,
    },
  })

  writeOutput(result.stdout, process.stdout.write.bind(process.stdout))
  writeOutput(result.stderr, process.stderr.write.bind(process.stderr))

  if (result.status !== 0) {
    const combinedOutput = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
    const isKnownNsisCleanupError =
      combinedOutput.includes("EBUSY: resource busy or locked, unlink") &&
      combinedOutput.includes('.nsis.7z')

    if (isKnownNsisCleanupError) {
      const installerPath = findCompletedWindowsInstaller()
      if (installerPath) {
        cleanupNsisTempArchive()
        console.warn(`[run-build-mode] installer already created, ignoring transient NSIS cleanup error: ${installerPath}`)
        return
      }
    }

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

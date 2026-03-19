import { spawn } from 'child_process'
import { app } from 'electron'
import fs from 'fs-extra'

import { getBundledNodeRuntimePath, getOpenClawDir, getOpenClawEntryPath } from './openclaw-paths'

export type OpenClawCliResult = {
  stdout: string
  stderr: string
  exitCode: number
}

export async function runOpenClawCli(args: string[]): Promise<OpenClawCliResult> {
  const nodeRuntimePath = await resolveOpenClawNodeRuntime()
  const openClawDir = getOpenClawDir()
  const entryPath = getOpenClawEntryPath()

  return new Promise<OpenClawCliResult>((resolve, reject) => {
    const child = spawn(nodeRuntimePath, [entryPath, ...args], {
      cwd: openClawDir,
      env: {
        ...process.env,
        OPENCLAW_NO_RESPAWN: '1',
        OPENCLAW_EMBEDDED_IN: 'ClawFast',
      },
      stdio: 'pipe',
      windowsHide: true,
    })

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.once('error', (error) => {
      reject(error)
    })

    child.once('close', (code) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code ?? 0,
      })
    })
  })
}

async function resolveOpenClawNodeRuntime(): Promise<string> {
  const overridePath = process.env.OPENCLAW_NODE_PATH?.trim()
  if (overridePath) {
    return overridePath
  }

  if (app.isPackaged) {
    const bundledPath = getBundledNodeRuntimePath()
    if (await fs.pathExists(bundledPath)) {
      return bundledPath
    }
  }

  return 'node'
}

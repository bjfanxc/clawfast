import { app } from 'electron'
import path from 'path'
import fs from 'fs-extra'

export function isBundledOpenClawEnabled() {
  return process.env.CLAWFAST_BUNDLE_OPENCLAW !== '0'
}

export function getBundledNodeRuntimePath(): string {
  if (app.isPackaged) {
    const executableName = process.platform === 'win32' ? 'node.exe' : 'node'
    return path.join(process.resourcesPath, 'node-runtime', executableName)
  }

  return process.execPath
}

export function getOpenClawDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'openclaw')
  }

  return path.join(process.cwd(), 'node_modules', 'openclaw')
}

export function getOpenClawEntryPath(): string {
  return path.join(getOpenClawDir(), 'openclaw.mjs')
}

export async function isOpenClawPresent(): Promise<boolean> {
  if (!isBundledOpenClawEnabled()) {
    return false
  }

  const packagePath = path.join(getOpenClawDir(), 'package.json')
  return fs.pathExists(packagePath)
}

export async function isBundledNodeRuntimePresent(): Promise<boolean> {
  if (!isBundledOpenClawEnabled()) {
    return false
  }

  return fs.pathExists(getBundledNodeRuntimePath())
}

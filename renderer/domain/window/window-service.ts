import { getIpcClient } from '@/domain/ipc/ipc-client'

export function minimizeWindow() {
  const ipc = getIpcClient()
  ipc.minimize()
}

export function maximizeWindow() {
  const ipc = getIpcClient()
  ipc.maximize()
}

export function closeWindow() {
  const ipc = getIpcClient()
  ipc.close()
}

export async function openExternalUrl(url: string) {
  const ipc = getIpcClient()
  return ipc.openExternal(url)
}

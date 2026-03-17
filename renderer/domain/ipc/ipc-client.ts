import type { IpcHandler } from '../../../main/preload'

export function getIpcClient(): IpcHandler {
  if (!window.ipc) {
    throw new Error('IPC client is not available')
  }
  return window.ipc
}

export function getIpcNamespace<K extends keyof IpcHandler>(namespace: K, message: string): NonNullable<IpcHandler[K]> {
  const client = getIpcClient()
  const target = client[namespace]
  if (!target) {
    throw new Error(message)
  }
  return target as NonNullable<IpcHandler[K]>
}

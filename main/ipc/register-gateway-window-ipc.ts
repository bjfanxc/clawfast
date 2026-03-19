import { ipcMain, shell } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc'
import type { IpcRegistrationContext } from './types'

export function registerGatewayWindowIpc({ gatewayClient, mainWindow }: IpcRegistrationContext) {
  ipcMain.on(IPC_CHANNELS.gateway.send, (event, message: unknown) => {
    const sent = gatewayClient.send(message)
    if (!sent) {
      console.warn('Cannot send to Gateway: WebSocket not ready (State:', gatewayClient.getReadyState(), ')')
      event.reply(IPC_CHANNELS.gateway.error, 'Gateway not connected')
    }
  })

  ipcMain.handle(IPC_CHANNELS.gateway.state, async () => {
    return { connected: gatewayClient.isConnected() }
  })

  ipcMain.handle(IPC_CHANNELS.gateway.restart, async () => {
    gatewayClient.restart()
    return { ok: true }
  })

  ipcMain.on(IPC_CHANNELS.window.minimize, () => {
    mainWindow.minimize()
  })

  ipcMain.on(IPC_CHANNELS.window.maximize, () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })

  ipcMain.on(IPC_CHANNELS.window.close, () => {
    mainWindow.close()
  })

  ipcMain.handle(IPC_CHANNELS.window.openExternal, async (_event, payload?: { url?: string }) => {
    const url = payload?.url?.trim()
    if (!url) {
      throw new Error('url is required')
    }
    await shell.openExternal(url)
    return { ok: true }
  })
}

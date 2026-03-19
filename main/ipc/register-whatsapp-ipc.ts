import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc'
import { whatsAppLoginManager } from '../utils/whatsapp-login'
import type { IpcRegistrationContext } from './types'

export function registerWhatsAppIpc({ mainWindow }: IpcRegistrationContext) {
  ipcMain.handle(IPC_CHANNELS.channels.requestWhatsAppQr, async (_event, payload?: { accountId?: string }) => {
    try {
      await whatsAppLoginManager.start(payload?.accountId?.trim() || 'whatsapp')
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  ipcMain.handle(IPC_CHANNELS.channels.cancelWhatsAppQr, async () => {
    try {
      await whatsAppLoginManager.stop()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  whatsAppLoginManager.on('qr', (data: { qr: string; raw: string }) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.channels.whatsappQr, data)
    }
  })

  whatsAppLoginManager.on('success', (data: { accountId: string }) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.channels.whatsappSuccess, data)
    }
  })

  whatsAppLoginManager.on('error', (message: string) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.channels.whatsappError, message)
    }
  })
}

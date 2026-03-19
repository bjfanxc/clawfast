import { ipcMain } from 'electron'

import { IPC_CHANNELS } from '../../shared/ipc'
import { approvePairingCode } from '../utils/pairing-store'

const SUPPORTED_PAIRING_CHANNELS = new Set(['telegram', 'whatsapp', 'discord', 'signal', 'imessage', 'slack', 'feishu'])

export function registerPairingIpc() {
  ipcMain.handle(
    IPC_CHANNELS.channels.pairingApprove,
    async (_event, payload?: { channelId?: string; code?: string }) => {
      const channelId = payload?.channelId?.trim().toLowerCase()
      const code = payload?.code?.trim().toUpperCase()

      if (!channelId || !SUPPORTED_PAIRING_CHANNELS.has(channelId)) {
        throw new Error('unsupported pairing channel')
      }

      if (!code) {
        throw new Error('pairing code is required')
      }

      return await approvePairingCode(channelId, code)
    },
  )
}

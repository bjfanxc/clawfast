import type { BrowserWindow } from 'electron'
import type { GatewayClient } from '../gateway/client'

export type IpcRegistrationContext = {
  gatewayClient: GatewayClient
  mainWindow: BrowserWindow
  openClawWsUrl: string
}

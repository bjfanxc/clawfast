import path from 'path'
import { app, BrowserWindow, BrowserWindowConstructorOptions } from 'electron'
import serve from 'electron-serve'

import { GatewayClient } from './gateway/client'
import { registerIpcHandlers } from './ipc/register-ipc-handlers'
import { getBundledAppIconPath } from './utils/openclaw-paths'

const isProd = process.env.NODE_ENV === 'production'
const shouldOpenDevTools = process.env.OPEN_DEVTOOLS === '1'
const GATEWAY_PORT = 18789
const openClawWsUrl = process.env.OPENCLAW_WS_URL?.trim() || `ws://localhost:${GATEWAY_PORT}`

const gatewayClient = new GatewayClient({
  port: GATEWAY_PORT,
  wsUrl: openClawWsUrl,
})

const createWindow = (name: string, options: BrowserWindowConstructorOptions) => {
  return new BrowserWindow({
    title: name,
    ...options,
  })
}

if (isProd) {
  serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

;(async () => {
  await app.whenReady()

  const mainWindow = createWindow('main', {
    width: 1600,
    height: 900,
    frame: false,
    autoHideMenuBar: true,
    icon: getBundledAppIconPath(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
    },
  })

  gatewayClient.start()
  registerIpcHandlers({
    gatewayClient,
    mainWindow,
    openClawWsUrl,
  })

  if (isProd) {
    await mainWindow.loadURL('app://./index.html')
  } else {
    const port = process.argv[2]
    await mainWindow.loadURL(`http://localhost:${port}/`)
    if (shouldOpenDevTools) {
      mainWindow.webContents.openDevTools()
    }
  }
})()

app.on('window-all-closed', () => {
  gatewayClient.stop()
  app.quit()
})

import path from 'path'
import { app, BrowserWindow, BrowserWindowConstructorOptions, ipcMain, shell } from 'electron'
import serve from 'electron-serve'

import { GatewayClient } from './gateway/client'
import { getChatHistory } from './utils/chat'
import { listChannels } from './utils/channels'
import { getCronSnapshot, removeCronJob, runCronJob, saveCronJob, toggleCronJob } from './utils/cron'
import { getDashboardAccessInfo, getDashboardOverview } from './utils/dashboard'
import { deleteSession, listSessions, patchSession } from './utils/sessions'
import { installSkill, listSkills, openSkillsFolder, updateSkill } from './utils/skills'
import { getUsageLogs, getUsageOverview, getUsageTimeSeries } from './utils/usage'
import { getConfigSnapshot, setConfigSnapshot } from './utils/config'
import { getBundledAppIconPath } from './utils/openclaw-paths'
import { IPC_CHANNELS } from '../shared/ipc'
import type { ListChannelsOptions } from '../shared/channels'
import type { ConfigSetPayload } from '../shared/config'
import type { CronDraft, CronRunMode } from '../shared/cron'
import type { InstallSkillPayload, ListSkillsOptions, UpdateSkillPayload } from '../shared/skills'
import type { UsageQueryPayload } from '../shared/usage'

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

  ipcMain.handle(IPC_CHANNELS.chat.history, async (_event, payload?: { sessionKey?: string }) => {
    const sessionKey = payload?.sessionKey?.trim()

    if (!sessionKey) {
      throw new Error('sessionKey is required')
    }

    return getChatHistory(gatewayClient, sessionKey)
  })

  ipcMain.handle(IPC_CHANNELS.skills.list, async (_event, payload?: ListSkillsOptions) => {
    return listSkills(gatewayClient, payload)
  })

  ipcMain.handle(IPC_CHANNELS.skills.setEnabled, async (_event, payload: { skillKey?: string; enabled?: boolean; agentId?: string | null }) => {
    const skillKey = payload?.skillKey?.trim()

    if (!skillKey) {
      throw new Error('skillKey is required')
    }

    return updateSkill(gatewayClient, {
      skillKey,
      enabled: Boolean(payload?.enabled),
      agentId: payload?.agentId ?? null,
    })
  })

  ipcMain.handle(IPC_CHANNELS.skills.update, async (_event, payload: UpdateSkillPayload) => {
    return updateSkill(gatewayClient, payload)
  })

  ipcMain.handle(IPC_CHANNELS.skills.install, async (_event, payload: InstallSkillPayload) => {
    return installSkill(gatewayClient, payload)
  })

  ipcMain.handle(IPC_CHANNELS.skills.openFolder, async (_event, payload?: ListSkillsOptions) => {
    return openSkillsFolder(gatewayClient, payload)
  })

  ipcMain.handle(IPC_CHANNELS.channels.list, async (_event, payload?: ListChannelsOptions) => {
    return listChannels(gatewayClient, payload)
  })

  ipcMain.handle(IPC_CHANNELS.cron.snapshot, async () => {
    return getCronSnapshot(gatewayClient)
  })

  ipcMain.handle(IPC_CHANNELS.cron.save, async (_event, payload?: CronDraft) => {
    if (!payload?.name?.trim()) {
      throw new Error('name is required')
    }

    return saveCronJob(gatewayClient, payload)
  })

  ipcMain.handle(IPC_CHANNELS.cron.toggle, async (_event, payload?: { id?: string; enabled?: boolean }) => {
    const id = payload?.id?.trim()

    if (!id) {
      throw new Error('id is required')
    }

    return toggleCronJob(gatewayClient, {
      id,
      enabled: Boolean(payload?.enabled),
    })
  })

  ipcMain.handle(IPC_CHANNELS.cron.run, async (_event, payload?: { id?: string; mode?: CronRunMode }) => {
    const id = payload?.id?.trim()

    if (!id) {
      throw new Error('id is required')
    }

    return runCronJob(gatewayClient, {
      id,
      mode: payload?.mode,
    })
  })

  ipcMain.handle(IPC_CHANNELS.cron.remove, async (_event, payload?: { id?: string }) => {
    const id = payload?.id?.trim()

    if (!id) {
      throw new Error('id is required')
    }

    return removeCronJob(gatewayClient, { id })
  })

  ipcMain.handle(IPC_CHANNELS.sessions.list, async () => {
    return listSessions(gatewayClient)
  })

  ipcMain.handle(IPC_CHANNELS.sessions.patch, async (_event, payload?: { key?: string; label?: string | null; thinkingLevel?: string | null; verboseLevel?: string | null; reasoningLevel?: string | null }) => {
    const key = payload?.key?.trim()

    if (!key) {
      throw new Error('key is required')
    }

    return patchSession(gatewayClient, {
      key,
      label: payload?.label ?? null,
      thinkingLevel: payload?.thinkingLevel ?? null,
      verboseLevel: payload?.verboseLevel ?? null,
      reasoningLevel: payload?.reasoningLevel ?? null,
    })
  })

  ipcMain.handle(IPC_CHANNELS.sessions.delete, async (_event, payload?: { key?: string; deleteTranscript?: boolean }) => {
    const key = payload?.key?.trim()

    if (!key) {
      throw new Error('key is required')
    }

    return deleteSession(gatewayClient, {
      key,
      deleteTranscript: payload?.deleteTranscript ?? true,
    })
  })

  ipcMain.handle(IPC_CHANNELS.usage.overview, async (_event, payload?: UsageQueryPayload) => {
    if (!payload?.startDate?.trim() || !payload?.endDate?.trim()) {
      throw new Error('startDate and endDate are required')
    }

    return getUsageOverview(gatewayClient, {
      startDate: payload.startDate.trim(),
      endDate: payload.endDate.trim(),
      timeZone: payload.timeZone ?? 'local',
    })
  })

  ipcMain.handle(IPC_CHANNELS.usage.timeSeries, async (_event, payload?: { key?: string }) => {
    return getUsageTimeSeries(gatewayClient, payload)
  })

  ipcMain.handle(IPC_CHANNELS.usage.logs, async (_event, payload?: { key?: string; limit?: number }) => {
    return getUsageLogs(gatewayClient, payload)
  })

  ipcMain.handle(IPC_CHANNELS.config.get, async () => {
    return getConfigSnapshot(gatewayClient)
  })

  ipcMain.handle(IPC_CHANNELS.config.set, async (_event, payload?: ConfigSetPayload) => {
    if (!payload?.raw?.trim() || !payload?.baseHash?.trim()) {
      throw new Error('raw and baseHash are required')
    }

    return setConfigSnapshot(gatewayClient, {
      raw: payload.raw,
      baseHash: payload.baseHash,
    })
  })

  ipcMain.handle(IPC_CHANNELS.dashboard.accessInfo, async () => {
    return getDashboardAccessInfo(openClawWsUrl)
  })

  ipcMain.handle(IPC_CHANNELS.dashboard.overview, async () => {
    return getDashboardOverview(gatewayClient, openClawWsUrl)
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

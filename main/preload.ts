import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc'
import type { ChatHistoryResponse } from '../shared/chat'
import type { ChannelsSnapshot } from '../shared/channels'
import type { CronDraft, CronRunMode, CronSnapshot } from '../shared/cron'
import type { DashboardAccessInfo, DashboardOverviewPayload } from '../shared/dashboard'
import type { ConfigSetPayload, ConfigSnapshot } from '../shared/config'
import type { GatewayConnectionState } from '../shared/gateway'
import type { SessionsDeletePayload, SessionsListPayload, SessionsPatchPayload } from '../shared/sessions'
import type {
  InstallSkillPayload,
  OpenSkillsFolderResult,
  SkillsSnapshot,
  UpdateSkillPayload,
} from '../shared/skills'
import type { SessionLogEntry, SessionUsageTimeSeries, UsageOverviewPayload, UsageQueryPayload } from '../shared/usage'

const handler = {
  send(channel: string, value: unknown) {
    ipcRenderer.send(channel, value)
  },
  invoke(channel: string, value?: unknown) {
    return ipcRenderer.invoke(channel, value)
  },
  on(channel: string, callback: (...args: unknown[]) => void) {
    const subscription = (_event: IpcRendererEvent, ...args: unknown[]) => callback(...args)
    ipcRenderer.on(channel, subscription)

    return () => {
      ipcRenderer.removeListener(channel, subscription)
    }
  },
  minimize: () => ipcRenderer.send(IPC_CHANNELS.window.minimize),
  maximize: () => ipcRenderer.send(IPC_CHANNELS.window.maximize),
  close: () => ipcRenderer.send(IPC_CHANNELS.window.close),
  openExternal: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.window.openExternal, { url }) as Promise<{ ok: true }>,
  chat: {
    history: (sessionKey: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.chat.history, { sessionKey }) as Promise<ChatHistoryResponse>,
  },
  skills: {
    list: (agentId?: string | null) =>
      ipcRenderer.invoke(IPC_CHANNELS.skills.list, { agentId: agentId ?? null }) as Promise<SkillsSnapshot>,
    setEnabled: (skillKey: string, enabled: boolean, agentId?: string | null) =>
      ipcRenderer.invoke(IPC_CHANNELS.skills.setEnabled, { skillKey, enabled, agentId: agentId ?? null }) as Promise<SkillsSnapshot>,
    update: (payload: UpdateSkillPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.skills.update, payload) as Promise<SkillsSnapshot>,
    install: (payload: InstallSkillPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.skills.install, payload) as Promise<SkillsSnapshot>,
    openFolder: (agentId?: string | null) =>
      ipcRenderer.invoke(IPC_CHANNELS.skills.openFolder, { agentId: agentId ?? null }) as Promise<OpenSkillsFolderResult>,
  },
  channels: {
    list: (probe?: boolean) =>
      ipcRenderer.invoke(IPC_CHANNELS.channels.list, { probe: Boolean(probe) }) as Promise<ChannelsSnapshot>,
  },
  cron: {
    snapshot: () => ipcRenderer.invoke(IPC_CHANNELS.cron.snapshot) as Promise<CronSnapshot>,
    save: (payload: CronDraft) =>
      ipcRenderer.invoke(IPC_CHANNELS.cron.save, payload) as Promise<CronSnapshot>,
    toggle: (id: string, enabled: boolean) =>
      ipcRenderer.invoke(IPC_CHANNELS.cron.toggle, { id, enabled }) as Promise<CronSnapshot>,
    run: (id: string, mode?: CronRunMode) =>
      ipcRenderer.invoke(IPC_CHANNELS.cron.run, { id, mode }) as Promise<CronSnapshot>,
    remove: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.cron.remove, { id }) as Promise<CronSnapshot>,
  },
  sessions: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.sessions.list) as Promise<SessionsListPayload>,
    patch: (payload: SessionsPatchPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.sessions.patch, payload) as Promise<SessionsListPayload>,
    delete: (payload: SessionsDeletePayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.sessions.delete, payload) as Promise<SessionsListPayload>,
  },
  usage: {
    overview: (payload: UsageQueryPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.usage.overview, payload) as Promise<UsageOverviewPayload>,
    timeSeries: (key: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.usage.timeSeries, { key }) as Promise<SessionUsageTimeSeries>,
    logs: (key: string, limit = 1000) =>
      ipcRenderer.invoke(IPC_CHANNELS.usage.logs, { key, limit }) as Promise<{ logs: SessionLogEntry[] }>,
  },
  config: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.config.get) as Promise<ConfigSnapshot>,
    set: (payload: ConfigSetPayload) => ipcRenderer.invoke(IPC_CHANNELS.config.set, payload) as Promise<ConfigSnapshot>,
  },
  dashboard: {
    getAccessInfo: () => ipcRenderer.invoke(IPC_CHANNELS.dashboard.accessInfo) as Promise<DashboardAccessInfo>,
    getOverview: () => ipcRenderer.invoke(IPC_CHANNELS.dashboard.overview) as Promise<DashboardOverviewPayload>,
  },
  gateway: {
    send: (message: unknown) => ipcRenderer.send(IPC_CHANNELS.gateway.send, message),
    getState: () => ipcRenderer.invoke(IPC_CHANNELS.gateway.state) as Promise<GatewayConnectionState>,
    onMessage: (callback: (message: string) => void) => {
      const subscription = (_event: IpcRendererEvent, message: string) => callback(message)
      ipcRenderer.on(IPC_CHANNELS.gateway.message, subscription)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.gateway.message, subscription)
      }
    },
    onError: (callback: (message: string) => void) => {
      const subscription = (_event: IpcRendererEvent, message: string) => callback(message)
      ipcRenderer.on(IPC_CHANNELS.gateway.error, subscription)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.gateway.error, subscription)
      }
    },
  },
}

contextBridge.exposeInMainWorld('ipc', handler)

export type IpcHandler = typeof handler

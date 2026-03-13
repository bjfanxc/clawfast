import type { ChannelsSnapshot } from './channels'

export interface DashboardAccessInfo {
  wsUrl: string
  tokenPreview: string | null
  configPath: string
  locale: string
  bundledOpenClaw: boolean
}

export interface DashboardPresenceEntry {
  host?: string
  ip?: string
  version?: string
  platform?: string
  deviceFamily?: string
  modelIdentifier?: string
  mode?: string
  reason?: string
  text?: string
  ts?: number
  roles?: string[]
  scopes?: string[]
  deviceId?: string
  instanceId?: string
}

export interface DashboardSessionListEntry {
  key?: string
  kind?: string
  displayName?: string
  updatedAt?: number
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  totalTokensFresh?: boolean
  modelProvider?: string
  model?: string
  contextTokens?: number
  lastChannel?: string
  lastAccountId?: string
}

export interface DashboardSessionsListPayload {
  ts?: number
  path?: string
  count?: number
  defaults?: {
    modelProvider?: string
    model?: string
    contextTokens?: number
  }
  sessions?: DashboardSessionListEntry[]
}

export interface DashboardCronStatusPayload {
  enabled?: boolean
  storePath?: string
  jobs?: number
  nextWakeAtMs?: number | null
}

export interface DashboardStatusPayload {
  heartbeat?: {
    defaultAgentId?: string
    agents?: Array<{
      agentId?: string
      enabled?: boolean
      every?: string
      everyMs?: number
    }>
  }
  channelSummary?: string[]
  queuedSystemEvents?: unknown[]
  sessions?: {
    count?: number
    defaults?: {
      model?: string
      contextTokens?: number
    }
    recent?: Array<{
      key?: string
      updatedAt?: number
      age?: number
      model?: string
      contextTokens?: number
    }>
  }
}

export interface DashboardHealthChannelAccount {
  configured?: boolean
  running?: boolean
  tokenSource?: string | null
  mode?: string | null
  accountId?: string
}

export interface DashboardHealthPayload {
  ok?: boolean
  ts?: number
  durationMs?: number
  heartbeatSeconds?: number
  defaultAgentId?: string
  channelOrder?: string[]
  channelLabels?: Record<string, string>
  channels?: Record<
    string,
    {
      configured?: boolean
      running?: boolean
      tokenSource?: string | null
      mode?: string | null
      accountId?: string
      accounts?: Record<string, DashboardHealthChannelAccount>
    }
  >
  agents?: Array<{
    agentId?: string
    isDefault?: boolean
    heartbeat?: {
      enabled?: boolean
      every?: string
      everyMs?: number
      prompt?: string
      target?: string
      ackMaxChars?: number
    }
    sessions?: {
      path?: string
      count?: number
      recent?: Array<{
        key?: string
        updatedAt?: number
        age?: number
      }>
    }
  }>
  sessions?: {
    path?: string
    count?: number
    recent?: Array<{
      key?: string
      updatedAt?: number
      age?: number
    }>
  }
}

export interface DashboardModelInfo {
  id?: string
  name?: string
  provider?: string
  contextWindow?: number
  reasoning?: boolean
  input?: string[]
}

export interface DashboardModelsListPayload {
  models?: DashboardModelInfo[]
}

export interface DashboardLastHeartbeatPayload {
  ts?: number
  status?: string
  reason?: string
  durationMs?: number
}

export interface DashboardOverviewPayload {
  fetchedAt: number
  access: DashboardAccessInfo
  channels: ChannelsSnapshot
  presence: DashboardPresenceEntry[]
  sessionsList: DashboardSessionsListPayload | null
  cron: DashboardCronStatusPayload | null
  status: DashboardStatusPayload | null
  health: DashboardHealthPayload | null
  models: DashboardModelsListPayload | null
  lastHeartbeat: DashboardLastHeartbeatPayload | null
}

import { app } from 'electron'

import type {
  DashboardAccessInfo,
  DashboardCronStatusPayload,
  DashboardHealthPayload,
  DashboardLastHeartbeatPayload,
  DashboardModelsListPayload,
  DashboardOverviewPayload,
  DashboardPresenceEntry,
  DashboardSessionsListPayload,
  DashboardStatusPayload,
} from '../../shared/dashboard'
import type { GatewayClient } from '../gateway/client'
import { listChannels } from './channels'
import { getGatewayToken, getOpenClawConfigPath } from './openclaw-config'
import { isBundledNodeRuntimePresent, isOpenClawPresent } from './openclaw-paths'

function maskToken(token: string | null) {
  if (!token) {
    return null
  }

  const trimmed = token.trim()
  if (!trimmed) {
    return null
  }

  if (trimmed.length <= 12) {
    return `${trimmed.slice(0, 4)}...${trimmed.slice(-2)}`
  }

  return `${trimmed.slice(0, 8)}...${trimmed.slice(-6)}`
}

function stripAnsi(value: string) {
  return value.replace(/\u001b\[[0-9;]*m/g, '').trim()
}

async function requestOptional<T>(client: GatewayClient, method: string, params?: unknown): Promise<T | null> {
  try {
    return await client.request<T>(method, params)
  } catch (error) {
    console.warn(`[dashboard] ${method} failed`, error)
    return null
  }
}

function normalizeStatusPayload(payload: DashboardStatusPayload | null): DashboardStatusPayload | null {
  if (!payload) {
    return null
  }

  return {
    ...payload,
    channelSummary: payload.channelSummary?.map(stripAnsi) ?? [],
  }
}

export async function getDashboardAccessInfo(wsUrl: string): Promise<DashboardAccessInfo> {
  const token = await getGatewayToken()
  const [bundledOpenClawPresent, bundledNodeRuntimePresent] = await Promise.all([
    isOpenClawPresent(),
    isBundledNodeRuntimePresent(),
  ])

  return {
    wsUrl,
    tokenPreview: maskToken(token),
    configPath: getOpenClawConfigPath(),
    locale: app.getLocale(),
    bundledOpenClaw: bundledOpenClawPresent && bundledNodeRuntimePresent,
  }
}

export async function getDashboardOverview(
  client: GatewayClient,
  wsUrl: string,
): Promise<DashboardOverviewPayload> {
  const access = await getDashboardAccessInfo(wsUrl)

  const [channels, presence, sessionsList, cron, status, health, models, lastHeartbeat] = await Promise.all([
    listChannels(client, { probe: false }).catch((error) => {
      console.warn('[dashboard] channels.status failed', error)
      return { snapshot: null, lastSuccessAt: null }
    }),
    requestOptional<DashboardPresenceEntry[]>(client, 'system-presence', {}),
    requestOptional<DashboardSessionsListPayload>(client, 'sessions.list', {
      includeGlobal: true,
      includeUnknown: false,
      limit: 120,
    }),
    requestOptional<DashboardCronStatusPayload>(client, 'cron.status', {}),
    requestOptional<DashboardStatusPayload>(client, 'status', {}),
    requestOptional<DashboardHealthPayload>(client, 'health', {}),
    requestOptional<DashboardModelsListPayload>(client, 'models.list', {}),
    requestOptional<DashboardLastHeartbeatPayload>(client, 'last-heartbeat', {}),
  ])

  return {
    fetchedAt: Date.now(),
    access,
    channels,
    presence: presence ?? [],
    sessionsList,
    cron,
    status: normalizeStatusPayload(status),
    health,
    models,
    lastHeartbeat,
  }
}

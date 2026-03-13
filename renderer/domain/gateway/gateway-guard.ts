import type { ChannelsSnapshot } from '../../../shared/channels'
import type { ConfigSnapshot } from '../../../shared/config'
import type { CronSnapshot } from '../../../shared/cron'
import type { DashboardAccessInfo, DashboardOverviewPayload } from '../../../shared/dashboard'
import type { SessionsListPayload } from '../../../shared/sessions'
import type { SkillsSnapshot } from '../../../shared/skills'
import type { UsageOverviewPayload } from '../../../shared/usage'
import { getGatewayConnectionState } from './gateway-service'

export async function isGatewayConnected() {
  try {
    const state = await getGatewayConnectionState()
    return state.connected
  } catch {
    return false
  }
}

export async function getOfflineDashboardOverview(): Promise<DashboardOverviewPayload> {
  const access = await getDashboardAccessInfoDirect()
  return {
    fetchedAt: Date.now(),
    access,
    channels: {
      snapshot: null,
      lastSuccessAt: null,
    },
    presence: [],
    sessionsList: null,
    cron: null,
    status: null,
    health: null,
    models: null,
    lastHeartbeat: null,
  }
}

async function getDashboardAccessInfoDirect(): Promise<DashboardAccessInfo> {
  if (!window.ipc?.dashboard) {
    throw new Error('Dashboard API is not available')
  }

  return window.ipc.dashboard.getAccessInfo()
}

export function getOfflineSkillsSnapshot(): SkillsSnapshot {
  return {
    skillsDir: '',
    workspaceDir: null,
    managedSkillsDir: null,
    agentId: null,
    skills: [],
    report: null,
  }
}

export function getOfflineChannelsSnapshot(): ChannelsSnapshot {
  return {
    snapshot: null,
    lastSuccessAt: null,
  }
}

export function getOfflineCronSnapshot(): CronSnapshot {
  return {
    status: null,
    jobs: [],
    total: 0,
    hasMore: false,
    nextOffset: null,
    modelSuggestions: [],
  }
}

export function getOfflineSessionsList(): SessionsListPayload {
  return {
    count: 0,
    sessions: [],
  }
}

export function getOfflineUsageOverview(startDate: string, endDate: string, timeZone: 'local' | 'utc'): UsageOverviewPayload {
  return {
    usage: null,
    costSummary: null,
    startDate,
    endDate,
    timeZone,
  }
}

export function getOfflineConfigSnapshot(): ConfigSnapshot {
  return {
    hash: '',
    raw: '{}',
    config: {},
    valid: true,
    issues: [],
    updatedAt: null,
  }
}

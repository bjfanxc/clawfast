import type { SessionLogEntry, SessionUsageTimeSeries, UsageDateMode, UsageOverviewPayload } from '../../../shared/usage'
import { getOfflineUsageOverview, isGatewayConnected } from '@/domain/gateway/gateway-guard'

export async function loadUsageOverview(startDate: string, endDate: string, timeZone: UsageDateMode = 'local') {
  if (!window.ipc?.usage) {
    throw new Error('Usage API is not available')
  }

  if (!(await isGatewayConnected())) {
    return getOfflineUsageOverview(startDate, endDate, timeZone)
  }

  return window.ipc.usage.overview({ startDate, endDate, timeZone }) as Promise<UsageOverviewPayload>
}

export async function loadUsageTimeSeries(key: string) {
  if (!window.ipc?.usage) {
    throw new Error('Usage API is not available')
  }

  return window.ipc.usage.timeSeries(key) as Promise<SessionUsageTimeSeries>
}

export async function loadUsageLogs(key: string, limit = 1000) {
  if (!window.ipc?.usage) {
    throw new Error('Usage API is not available')
  }

  if (!(await isGatewayConnected())) {
    return []
  }

  const result = await window.ipc.usage.logs(key, limit) as { logs: SessionLogEntry[] }
  return result.logs ?? []
}

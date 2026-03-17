import type { SessionLogEntry, SessionUsageTimeSeries, UsageDateMode, UsageOverviewPayload } from '../../../shared/usage'
import { getOfflineUsageOverview, isGatewayConnected } from '@/domain/gateway/gateway-guard'
import { getIpcNamespace } from '@/domain/ipc/ipc-client'

export async function loadUsageOverview(startDate: string, endDate: string, timeZone: UsageDateMode = 'local') {
  const usage = getIpcNamespace('usage', 'Usage API is not available')

  if (!(await isGatewayConnected())) {
    return getOfflineUsageOverview(startDate, endDate, timeZone)
  }

  return usage.overview({ startDate, endDate, timeZone }) as Promise<UsageOverviewPayload>
}

export async function loadUsageTimeSeries(key: string) {
  const usage = getIpcNamespace('usage', 'Usage API is not available')
  return usage.timeSeries(key) as Promise<SessionUsageTimeSeries>
}

export async function loadUsageLogs(key: string, limit = 1000) {
  const usage = getIpcNamespace('usage', 'Usage API is not available')

  if (!(await isGatewayConnected())) {
    return []
  }

  const result = await usage.logs(key, limit) as { logs: SessionLogEntry[] }
  return result.logs ?? []
}

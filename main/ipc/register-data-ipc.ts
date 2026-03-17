import { ipcMain } from 'electron'
import { getUsageLogs, getUsageOverview, getUsageTimeSeries } from '../utils/usage'
import { getConfigSnapshot, setConfigSnapshot } from '../utils/config'
import { getDashboardAccessInfo, getDashboardOverview } from '../utils/dashboard'
import { IPC_CHANNELS } from '../../shared/ipc'
import type { ConfigSetPayload } from '../../shared/config'
import type { UsageQueryPayload } from '../../shared/usage'
import type { IpcRegistrationContext } from './types'

export function registerDataIpc({ gatewayClient, openClawWsUrl }: IpcRegistrationContext) {
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
}

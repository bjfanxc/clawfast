import type { DashboardAccessInfo, DashboardOverviewPayload } from '../../../shared/dashboard'
import { getOfflineDashboardOverview, isGatewayConnected } from '@/domain/gateway/gateway-guard'
import { getIpcNamespace } from '@/domain/ipc/ipc-client'

export async function loadDashboardAccessInfo(): Promise<DashboardAccessInfo> {
  const dashboard = getIpcNamespace('dashboard', 'Dashboard API is not available')
  return dashboard.getAccessInfo()
}

export async function loadDashboardOverview(): Promise<DashboardOverviewPayload> {
  const dashboard = getIpcNamespace('dashboard', 'Dashboard API is not available')

  if (!(await isGatewayConnected())) {
    return getOfflineDashboardOverview()
  }

  return dashboard.getOverview()
}

import type { DashboardAccessInfo, DashboardOverviewPayload } from '../../../shared/dashboard'
import { getOfflineDashboardOverview, isGatewayConnected } from '@/domain/gateway/gateway-guard'

export async function loadDashboardAccessInfo(): Promise<DashboardAccessInfo> {
  if (!window.ipc?.dashboard) {
    throw new Error('Dashboard API is not available')
  }

  return window.ipc.dashboard.getAccessInfo()
}

export async function loadDashboardOverview(): Promise<DashboardOverviewPayload> {
  if (!window.ipc?.dashboard) {
    throw new Error('Dashboard API is not available')
  }

  if (!(await isGatewayConnected())) {
    return getOfflineDashboardOverview()
  }

  return window.ipc.dashboard.getOverview()
}

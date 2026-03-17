import React from 'react'
import { loadDashboardOverview } from '@/domain/dashboard/dashboard-service'
import type { DashboardOverviewPayload } from '../../../shared/dashboard'

export function useDashboardOverview(refreshSignal = 0, onError?: (message: string) => void) {
  const [overview, setOverview] = React.useState<DashboardOverviewPayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)

  const refreshOverview = React.useCallback(async () => {
    setRefreshing(true)
    try {
      const payload = await loadDashboardOverview()
      setOverview(payload)
    } catch (err) {
      onError?.(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [onError])

  React.useEffect(() => {
    void refreshOverview()
  }, [refreshOverview])

  React.useEffect(() => {
    if (refreshSignal <= 0) {
      return
    }
    void refreshOverview()
  }, [refreshOverview, refreshSignal])

  return {
    overview,
    loading,
    refreshing,
    refreshOverview,
  }
}

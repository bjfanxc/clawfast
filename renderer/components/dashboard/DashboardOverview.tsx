'use client'

import React from 'react'
import DashboardOverviewPanel from './DashboardOverviewPanel'
import { useDashboardOverview } from '@/hooks/dashboard/useDashboardOverview'
import { useToastStore } from '@/store/toast-store'

export default function DashboardOverview({ refreshSignal = 0 }: { refreshSignal?: number }) {
  const pushToast = useToastStore((state) => state.pushToast)
  const handleError = React.useCallback((message: string) => {
    pushToast('error', message)
  }, [pushToast])
  const { overview, loading, refreshing, refreshOverview } = useDashboardOverview(
    refreshSignal,
    handleError
  )

  return (
    <DashboardOverviewPanel
      overview={overview}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => void refreshOverview()}
    />
  )
}

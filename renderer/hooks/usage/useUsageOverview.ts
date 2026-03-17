import React from 'react'
import type { TFunction } from 'i18next'
import { loadUsageLogs, loadUsageOverview } from '@/domain/usage/usage-service'
import {
  buildDailySeries,
  buildOverviewStats,
  buildPeakErrorDays,
  buildPeakErrorHours,
  buildUsageTotals,
  formatCompact,
  formatDateInput,
  formatTokens,
} from '@/lib/usage/selectors'
import type { SessionLogEntry, UsageOverviewPayload } from '../../../shared/usage'

export function useUsageOverview(t: TFunction, onError?: (message: string) => void) {
  const [startDate, setStartDate] = React.useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 6)
    return formatDateInput(date)
  })
  const [endDate, setEndDate] = React.useState(() => formatDateInput(new Date()))
  const [overview, setOverview] = React.useState<UsageOverviewPayload | null>(null)
  const [selectedSessionKey, setSelectedSessionKey] = React.useState<string | null>(null)
  const [logs, setLogs] = React.useState<SessionLogEntry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [detailLoading, setDetailLoading] = React.useState(false)
  const [dailyChartMode, setDailyChartMode] = React.useState<'total' | 'byType'>('byType')

  const sessions = React.useMemo(
    () => [...(overview?.usage?.sessions ?? [])].sort((a, b) => (b.usage?.totalTokens ?? 0) - (a.usage?.totalTokens ?? 0)),
    [overview]
  )
  const selectedSession = React.useMemo(
    () => sessions.find((session) => session.key === selectedSessionKey) ?? null,
    [selectedSessionKey, sessions]
  )

  const refreshOverview = React.useCallback(async (preserveKey?: string | null) => {
    setLoading(true)
    try {
      const next = await loadUsageOverview(startDate, endDate, 'local')
      setOverview(next)
      const nextSessions = [...(next.usage?.sessions ?? [])].sort((a, b) => (b.usage?.totalTokens ?? 0) - (a.usage?.totalTokens ?? 0))
      setSelectedSessionKey(preserveKey && nextSessions.some((session) => session.key === preserveKey) ? preserveKey : nextSessions[0]?.key ?? null)
    } catch (err) {
      onError?.(`${t('usage.loadFailed')}: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }, [endDate, onError, startDate, t])

  React.useEffect(() => {
    void refreshOverview()
  }, [refreshOverview])

  React.useEffect(() => {
    if (!selectedSessionKey) {
      setLogs([])
      return
    }
    let active = true
    setDetailLoading(true)
    loadUsageLogs(selectedSessionKey)
      .then((logItems) => {
        if (!active) return
        setLogs(logItems)
      })
      .catch((err) => {
        if (!active) return
        onError?.(err instanceof Error ? err.message : String(err))
        setLogs([])
      })
      .finally(() => {
        if (active) setDetailLoading(false)
      })
    return () => {
      active = false
    }
  }, [onError, selectedSessionKey])

  const totals = React.useMemo(() => buildUsageTotals(overview?.usage?.totals), [overview])
  const stats = React.useMemo(() => buildOverviewStats(sessions, totals), [sessions, totals])
  const daily = React.useMemo(() => buildDailySeries(overview), [overview])
  const topModels = React.useMemo(
    () => (overview?.usage?.aggregates?.byModel ?? []).slice(0, 5).map((item) => ({ label: item.label || item.model || item.key || '-', value: formatCompact(item.totals.totalTokens), sub: `${formatTokens(item.totals.totalTokens)} tokens` })),
    [overview]
  )
  const topProviders = React.useMemo(
    () => (overview?.usage?.aggregates?.byProvider ?? []).slice(0, 5).map((item) => ({ label: item.label || item.provider || item.key || '-', value: formatCompact(item.totals.totalTokens), sub: `${formatTokens(item.totals.totalTokens)} tokens` })),
    [overview]
  )
  const topAgents = React.useMemo(
    () => (overview?.usage?.aggregates?.byAgent ?? []).slice(0, 5).map((item) => ({ label: item.label || item.key || '-', value: formatCompact(item.totals.totalTokens), sub: `${formatTokens(item.totals.totalTokens)} tokens` })),
    [overview]
  )
  const topChannels = React.useMemo(
    () => (overview?.usage?.aggregates?.byChannel ?? []).slice(0, 5).map((item) => ({ label: item.label || item.key || '-', value: formatCompact(item.totals.totalTokens), sub: `${formatTokens(item.totals.totalTokens)} tokens` })),
    [overview]
  )
  const topTools = React.useMemo(
    () => (overview?.usage?.aggregates?.tools?.tools ?? []).slice(0, 6).map((tool) => ({ label: tool.name, value: String(tool.count), sub: 'calls' })),
    [overview]
  )
  const peakErrorDays = React.useMemo(() => buildPeakErrorDays(sessions), [sessions])
  const peakErrorHours = React.useMemo(() => buildPeakErrorHours(sessions), [sessions])
  const sessionTools = React.useMemo(
    () => (selectedSession?.usage?.toolUsage?.tools ?? []).slice(0, 6).map((tool) => ({ label: tool.name, value: String(tool.count), sub: 'calls' })),
    [selectedSession]
  )
  const sessionModels = React.useMemo(
    () => (selectedSession?.usage?.modelUsage ?? []).slice(0, 6).map((entry, index) => ({ label: entry.model || entry.provider || `${t('usage.modelMixFallback')} ${index + 1}`, value: formatCompact(entry.totals.totalTokens), sub: `${formatTokens(entry.totals.totalTokens)} tokens` })),
    [selectedSession, t]
  )

  return {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    overview,
    sessions,
    selectedSession,
    selectedSessionKey,
    setSelectedSessionKey,
    logs,
    loading,
    detailLoading,
    dailyChartMode,
    setDailyChartMode,
    refreshOverview,
    totals,
    stats,
    daily,
    topModels,
    topProviders,
    topAgents,
    topChannels,
    topTools,
    peakErrorDays,
    peakErrorHours,
    sessionTools,
    sessionModels,
  }
}

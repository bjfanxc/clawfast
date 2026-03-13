'use client'

import React from 'react'
import { Activity, BarChart3, CalendarRange, Loader2, RefreshCcw, ScrollText, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { loadUsageLogs, loadUsageOverview } from '@/domain/usage/usage-service'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/store/toast-store'
import type { CostUsageDailyEntry, SessionLogEntry, UsageOverviewPayload, UsageSessionEntry, UsageTotals } from '../../../shared/usage'

type ChartMode = 'total' | 'byType'

type InsightItem = { label: string; value: string; sub: string }

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatTokens(value?: number | null) {
  return new Intl.NumberFormat('en-US').format(value ?? 0)
}

function formatCompact(value?: number | null) {
  const amount = value ?? 0
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`
  return String(Math.round(amount))
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`
}

function formatRelativeTime(timestamp?: number | null) {
  if (!timestamp) return '-'
  const diff = Math.max(0, Date.now() - timestamp)
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatDuration(durationMs?: number | null) {
  const duration = Math.max(0, durationMs ?? 0)
  if (!duration) return '-'
  const minutes = Math.floor(duration / 60_000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m`
  return `${Math.max(1, Math.floor(duration / 1000))}s`
}

function getSessionTitle(session: UsageSessionEntry) {
  return session.label?.trim() || session.displayName || session.key
}

function getLogRoleLabel(role: SessionLogEntry['role'], t: ReturnType<typeof useTranslation>['t']) {
  return role === 'assistant' || role === 'tool' || role === 'toolResult' ? t('sessions.roleAssistant') : t('sessions.roleUser')
}

function buildUsageTotals(totals?: UsageTotals | null) {
  return {
    input: totals?.input ?? 0,
    output: totals?.output ?? 0,
    cacheRead: totals?.cacheRead ?? 0,
    cacheWrite: totals?.cacheWrite ?? 0,
    totalTokens: totals?.totalTokens ?? 0,
    totalCost: totals?.totalCost ?? 0,
    inputCost: totals?.inputCost ?? 0,
    outputCost: totals?.outputCost ?? 0,
    cacheReadCost: totals?.cacheReadCost ?? 0,
    cacheWriteCost: totals?.cacheWriteCost ?? 0,
  }
}

function getBounds(session: UsageSessionEntry) {
  const first = session.usage?.firstActivity ?? session.updatedAt ?? null
  const last = session.usage?.lastActivity ?? session.updatedAt ?? null
  if (!first || !last) return null
  return { start: Math.min(first, last), end: Math.max(first, last) }
}

function getDayKey(timestamp: number) {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function accumulateUsage(target: ReturnType<typeof buildUsageTotals>, source?: Partial<UsageTotals> | null, share = 1) {
  if (!source) return target
  target.input += (source.input ?? 0) * share
  target.output += (source.output ?? 0) * share
  target.cacheRead += (source.cacheRead ?? 0) * share
  target.cacheWrite += (source.cacheWrite ?? 0) * share
  target.totalTokens += (source.totalTokens ?? 0) * share
  target.totalCost += (source.totalCost ?? 0) * share
  target.inputCost += (source.inputCost ?? 0) * share
  target.outputCost += (source.outputCost ?? 0) * share
  target.cacheReadCost += (source.cacheReadCost ?? 0) * share
  target.cacheWriteCost += (source.cacheWriteCost ?? 0) * share
  return target
}

function buildDailySeries(overview: UsageOverviewPayload | null) {
  if (overview?.usage?.costDaily?.length) return overview.usage.costDaily

  const map = new Map<string, ReturnType<typeof buildUsageTotals>>()
  for (const session of overview?.usage?.sessions ?? []) {
    const usage = session.usage
    const dates = usage?.activityDates?.length ? usage.activityDates : session.updatedAt ? [getDayKey(session.updatedAt)] : []
    if (!usage || !dates.length) continue
    const share = 1 / dates.length
    for (const date of dates) {
      const totals = map.get(date) ?? buildUsageTotals()
      accumulateUsage(totals, usage, share)
      map.set(date, totals)
    }
  }

  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, totals]) => ({ date, ...totals })) as CostUsageDailyEntry[]
}

function buildOverviewStats(sessions: UsageSessionEntry[], totals: ReturnType<typeof buildUsageTotals>) {
  let messages = 0
  let toolCalls = 0
  let errors = 0
  let durationMinutes = 0

  for (const session of sessions) {
    messages += session.usage?.messageCounts?.total ?? 0
    toolCalls += session.usage?.toolUsage?.totalCalls ?? 0
    errors += session.usage?.messageCounts?.errors ?? 0
    durationMinutes += Math.max(0, (session.usage?.durationMs ?? 0) / 60_000)
  }

  const promptTokens = totals.input + totals.cacheRead
  return {
    messages,
    toolCalls,
    errors,
    avgTokens: messages > 0 ? totals.totalTokens / messages : 0,
    throughput: durationMinutes > 0 ? totals.totalTokens / durationMinutes : 0,
    errorRate: messages > 0 ? (errors / messages) * 100 : 0,
    cacheHitRate: promptTokens > 0 ? (totals.cacheRead / promptTokens) * 100 : 0,
  }
}

function buildActivityStats(sessions: UsageSessionEntry[]) {
  const weekdayTotals = Array.from({ length: 7 }, () => 0)
  const hourTotals = Array.from({ length: 24 }, () => 0)
  let totalTokens = 0

  for (const session of sessions) {
    const bounds = getBounds(session)
    const tokens = session.usage?.totalTokens ?? 0
    if (!bounds || tokens <= 0) continue
    totalTokens += tokens
    const durationMinutes = Math.max((bounds.end - bounds.start) / 60_000, 1)
    let cursor = bounds.start
    while (cursor <= bounds.end) {
      const date = new Date(cursor)
      const next = new Date(date)
      next.setMinutes(59, 59, 999)
      const nextTime = Math.min(next.getTime(), bounds.end)
      const share = Math.max((nextTime - cursor) / 60_000, 0.5) / durationMinutes
      weekdayTotals[date.getDay()] += tokens * share
      hourTotals[date.getHours()] += tokens * share
      cursor = nextTime + 1
    }
  }

  return { totalTokens, weekdayTotals, hourTotals }
}

function buildPeakErrorDays(sessions: UsageSessionEntry[]): InsightItem[] {
  const map = new Map<string, { errors: number; messages: number; tokens: number }>()
  for (const session of sessions) {
    const dates = session.usage?.activityDates?.length ? session.usage.activityDates : session.updatedAt ? [getDayKey(session.updatedAt)] : []
    if (!dates.length) continue
    const share = 1 / dates.length
    for (const date of dates) {
      const current = map.get(date) ?? { errors: 0, messages: 0, tokens: 0 }
      current.errors += (session.usage?.messageCounts?.errors ?? 0) * share
      current.messages += (session.usage?.messageCounts?.total ?? 0) * share
      current.tokens += (session.usage?.totalTokens ?? 0) * share
      map.set(date, current)
    }
  }

  return Array.from(map.entries())
    .map(([date, value]) => ({ date, ...value, rate: value.messages > 0 ? value.errors / value.messages : 0 }))
    .filter((item) => item.errors > 0 && item.messages > 0)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5)
    .map((item) => ({
      label: new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: formatPercent(item.rate * 100),
      sub: `${Math.round(item.errors)} errors - ${Math.round(item.messages)} msgs - ${formatCompact(item.tokens)}`,
    }))
}

function buildPeakErrorHours(sessions: UsageSessionEntry[]): InsightItem[] {
  const hourErrors = Array.from({ length: 24 }, () => 0)
  const hourMessages = Array.from({ length: 24 }, () => 0)

  for (const session of sessions) {
    const bounds = getBounds(session)
    const totalMessages = session.usage?.messageCounts?.total ?? 0
    if (!bounds || totalMessages <= 0) continue
    const durationMinutes = Math.max((bounds.end - bounds.start) / 60_000, 1)
    let cursor = bounds.start
    while (cursor <= bounds.end) {
      const date = new Date(cursor)
      const next = new Date(date)
      next.setMinutes(59, 59, 999)
      const nextTime = Math.min(next.getTime(), bounds.end)
      const share = Math.max((nextTime - cursor) / 60_000, 0.5) / durationMinutes
      hourErrors[date.getHours()] += (session.usage?.messageCounts?.errors ?? 0) * share
      hourMessages[date.getHours()] += totalMessages * share
      cursor = nextTime + 1
    }
  }

  return hourMessages
    .map((messages, hour) => ({ hour, messages, errors: hourErrors[hour], rate: messages > 0 ? hourErrors[hour] / messages : 0 }))
    .filter((item) => item.errors > 0 && item.messages > 0)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5)
    .map((item) => ({
      label: new Date(2000, 0, 1, item.hour).toLocaleTimeString(undefined, { hour: 'numeric' }),
      value: formatPercent(item.rate * 100),
      sub: `${Math.round(item.errors)} errors - ${Math.round(item.messages)} msgs`,
    }))
}


function SummaryCard({ icon: Icon, title, value, hint }: { icon: React.ComponentType<{ className?: string }>; title: string; value: string; hint: string }) {
  return (
    <Card className="app-subpanel rounded-[28px] shadow-none">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/16 bg-primary/10 text-primary dark:border-primary/24 dark:bg-primary/18 dark:text-primary-foreground"><Icon className="h-5 w-5" /></div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-muted-foreground">{title}</div>
            <div className="mt-2 break-words text-3xl font-black tracking-tight text-foreground">{value}</div>
            <div className="mt-2 break-words text-xs leading-5 text-muted-foreground">{hint}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function InsightList({ title, items, empty }: { title: string; items: InsightItem[]; empty: string }) {
  return (
    <Card className="app-subpanel rounded-[26px] shadow-none">
      <CardContent className="p-4">
        <div className="mb-4 text-base font-bold text-foreground">{title}</div>
        {items.length === 0 ? <div className="text-sm text-muted-foreground">{empty}</div> : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={`${title}-${item.label}`} className="flex items-start justify-between gap-3">
                <div className="min-w-0"><div className="truncate text-sm font-medium text-foreground">{item.label}</div><div className="mt-1 text-xs text-muted-foreground">{item.sub}</div></div>
                <div className="shrink-0 text-sm font-semibold text-foreground">{item.value}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DailyChart({ daily, chartMode }: { daily: CostUsageDailyEntry[]; chartMode: ChartMode }) {
  const values = daily.map((item) => item.totalTokens)
  const maxValue = Math.max(...values, 1)

  return (
    <div className="flex min-h-[220px] items-end gap-3 overflow-x-auto pb-2">
      {daily.map((item) => {
        const total = item.totalTokens
        const height = Math.max(12, Math.round((total / maxValue) * 160))
        const segments = chartMode === 'byType'
          ? [
              { value: item.output, color: 'bg-primary' },
              { value: item.input, color: 'bg-primary/80' },
              { value: item.cacheWrite, color: 'bg-primary/60' },
              { value: item.cacheRead, color: 'bg-primary/40' },
            ]
          : []
        const segmentTotal = segments.reduce((sum, part) => sum + part.value, 0) || 1

        return (
          <div key={item.date} className="flex min-w-[56px] flex-col items-center gap-2">
            <div className="text-[11px] font-medium text-muted-foreground">{formatCompact(item.totalTokens)}</div>
            {chartMode === 'byType' ? (
               <div className="flex w-full flex-col justify-end overflow-hidden rounded-t-2xl bg-muted/70 dark:bg-muted/35" style={{ height: `${height}px` }} title={`${item.date}\n${formatTokens(item.totalTokens)}`}>
                {segments.map((segment, index) => (
                  <div key={`${item.date}-${index}`} className={segment.color} style={{ height: `${Math.max((segment.value / segmentTotal) * 100, segment.value > 0 ? 2 : 0)}%` }} />
                ))}
              </div>
            ) : (
               <div className="w-full rounded-t-2xl bg-primary/80 dark:bg-primary/70" style={{ height: `${height}px` }} title={`${item.date}\n${formatTokens(item.totalTokens)}`} />
            )}
            <div className="text-[11px] text-muted-foreground">{item.date.slice(5)}</div>
          </div>
        )
      })}
    </div>
  )
}

function BreakdownBar({ totals }: { totals: ReturnType<typeof buildUsageTotals> }) {
  const total = Math.max(totals.totalTokens, 1)
  const items = [
    { label: `Output ${formatCompact(totals.output)}`, value: totals.output, color: 'bg-primary' },
    { label: `Input ${formatCompact(totals.input)}`, value: totals.input, color: 'bg-primary/80' },
    { label: `Cache Write ${formatCompact(totals.cacheWrite)}`, value: totals.cacheWrite, color: 'bg-primary/60' },
    { label: `Cache Read ${formatCompact(totals.cacheRead)}`, value: totals.cacheRead, color: 'bg-primary/40' },
  ]

  return (
    <div className="space-y-3 rounded-[24px] border border-border/80 bg-muted/35 p-4">
      <div className="text-base font-bold text-foreground">Tokens by Type</div>
      <div className="flex h-7 overflow-hidden rounded-full bg-muted/80 dark:bg-muted/40">
        {items.map((item) => <div key={item.label} className={item.color} style={{ width: `${Math.max((item.value / total) * 100, item.value > 0 ? 1 : 0)}%` }} title={item.label} />)}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {items.map((item) => <div key={item.label} className="flex items-center gap-2"><span className={cn('h-3 w-3 rounded-sm', item.color)} /><span>{item.label}</span></div>)}
      </div>
    </div>
  )
}

function ActivityPanel({ sessions, t }: { sessions: UsageSessionEntry[]; t: ReturnType<typeof useTranslation>['t'] }) {
  const stats = React.useMemo(() => buildActivityStats(sessions), [sessions])
  const maxDay = Math.max(...stats.weekdayTotals, 1)
  const maxHour = Math.max(...stats.hourTotals, 1)

  return (
    <Card className="app-subpanel rounded-[30px] shadow-none">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div><CardTitle className="text-2xl font-black">{t('usage.activityTitle')}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{t('usage.activityHint')}</p></div>
          <div className="text-right"><div className="text-3xl font-black text-foreground">{formatCompact(stats.totalTokens)}</div><div className="text-sm text-muted-foreground">{t('usage.tokensLabel')}</div></div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-[24px] border border-border/80 bg-muted/35 p-4">
          <div className="mb-4 text-sm font-semibold text-foreground">{t('usage.activityWeekdays')}</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-3">
            {WEEKDAYS.map((label, index) => <div key={label} className="rounded-2xl border border-rose-200 px-4 py-3 dark:border-rose-500/20" style={{ backgroundColor: `rgba(244, 63, 94, ${stats.weekdayTotals[index] > 0 ? 0.12 + (stats.weekdayTotals[index] / maxDay) * 0.6 : 0.04})` }}><div className="text-sm font-semibold text-foreground">{label}</div><div className="mt-2 text-lg text-foreground">{formatCompact(stats.weekdayTotals[index])}</div></div>)}
          </div>
        </div>
        <div className="rounded-[24px] border border-border/80 bg-muted/35 p-4">
          <div className="mb-4 flex items-center justify-between gap-3"><div className="text-sm font-semibold text-foreground">{t('usage.activityHours')}</div><div className="text-xs text-muted-foreground">0 - 23</div></div>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 xl:grid-cols-12">
            {stats.hourTotals.map((value, hour) => <div key={hour} className="space-y-2"><div className="h-8 rounded-xl border border-rose-200 dark:border-rose-500/20" style={{ backgroundColor: `rgba(244, 63, 94, ${value > 0 ? 0.08 + (value / maxHour) * 0.75 : 0.04})` }} title={`${hour}:00 - ${formatCompact(value)} tokens`} /><div className="text-center text-[11px] text-muted-foreground">{hour}</div></div>)}
          </div>
          <div className="mt-4 text-xs text-muted-foreground">{t('usage.activityLegend')}</div>
        </div>
      </CardContent>
    </Card>
  )
}


export default function UsageView() {
  const { t } = useTranslation()
  const [startDate, setStartDate] = React.useState(() => { const date = new Date(); date.setDate(date.getDate() - 6); return formatDateInput(date) })
  const [endDate, setEndDate] = React.useState(() => formatDateInput(new Date()))
  const [overview, setOverview] = React.useState<UsageOverviewPayload | null>(null)
  const [selectedSessionKey, setSelectedSessionKey] = React.useState<string | null>(null)
  const [logs, setLogs] = React.useState<SessionLogEntry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [detailLoading, setDetailLoading] = React.useState(false)
  const [dailyChartMode, setDailyChartMode] = React.useState<ChartMode>('byType')
  const pushToast = useToastStore((state) => state.pushToast)

  const sessions = React.useMemo(() => [...(overview?.usage?.sessions ?? [])].sort((a, b) => (b.usage?.totalTokens ?? 0) - (a.usage?.totalTokens ?? 0)), [overview])
  const selectedSession = React.useMemo(() => sessions.find((session) => session.key === selectedSessionKey) ?? null, [selectedSessionKey, sessions])

  const refreshOverview = React.useCallback(async (preserveKey?: string | null) => {
    setLoading(true)
    try {
      const next = await loadUsageOverview(startDate, endDate, 'local')
      setOverview(next)
      const nextSessions = [...(next.usage?.sessions ?? [])].sort((a, b) => (b.usage?.totalTokens ?? 0) - (a.usage?.totalTokens ?? 0))
      setSelectedSessionKey(preserveKey && nextSessions.some((session) => session.key === preserveKey) ? preserveKey : nextSessions[0]?.key ?? null)
    } catch (err) {
      pushToast('error', `${t('usage.loadFailed')}: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }, [endDate, pushToast, startDate, t])

  React.useEffect(() => { void refreshOverview() }, [refreshOverview])

  React.useEffect(() => {
    if (!selectedSessionKey) { setLogs([]); return }
    let active = true
    setDetailLoading(true)
    loadUsageLogs(selectedSessionKey).then((logItems) => {
      if (!active) return
      setLogs(logItems)
    }).catch((err) => {
      if (!active) return
      pushToast('error', err instanceof Error ? err.message : String(err))
      setLogs([])
    }).finally(() => { if (active) setDetailLoading(false) })
    return () => { active = false }
  }, [pushToast, selectedSessionKey])

  const totals = React.useMemo(() => buildUsageTotals(overview?.usage?.totals), [overview])
  const stats = React.useMemo(() => buildOverviewStats(sessions, totals), [sessions, totals])
  const daily = React.useMemo(() => buildDailySeries(overview), [overview])
  const insightEmpty = t('usage.insights.empty')
  const topModels = React.useMemo(() => (overview?.usage?.aggregates?.byModel ?? []).slice(0, 5).map((item) => ({ label: item.label || item.model || item.key || '-', value: formatCompact(item.totals.totalTokens), sub: `${formatTokens(item.totals.totalTokens)} tokens` })), [overview])
  const topProviders = React.useMemo(() => (overview?.usage?.aggregates?.byProvider ?? []).slice(0, 5).map((item) => ({ label: item.label || item.provider || item.key || '-', value: formatCompact(item.totals.totalTokens), sub: `${formatTokens(item.totals.totalTokens)} tokens` })), [overview])
  const topAgents = React.useMemo(() => (overview?.usage?.aggregates?.byAgent ?? []).slice(0, 5).map((item) => ({ label: item.label || item.key || '-', value: formatCompact(item.totals.totalTokens), sub: `${formatTokens(item.totals.totalTokens)} tokens` })), [overview])
  const topChannels = React.useMemo(() => (overview?.usage?.aggregates?.byChannel ?? []).slice(0, 5).map((item) => ({ label: item.label || item.key || '-', value: formatCompact(item.totals.totalTokens), sub: `${formatTokens(item.totals.totalTokens)} tokens` })), [overview])
  const topTools = React.useMemo(() => (overview?.usage?.aggregates?.tools?.tools ?? []).slice(0, 6).map((tool) => ({ label: tool.name, value: String(tool.count), sub: 'calls' })), [overview])
  const peakErrorDays = React.useMemo(() => buildPeakErrorDays(sessions), [sessions])
  const peakErrorHours = React.useMemo(() => buildPeakErrorHours(sessions), [sessions])
  const sessionTools = React.useMemo(() => (selectedSession?.usage?.toolUsage?.tools ?? []).slice(0, 6).map((tool) => ({ label: tool.name, value: String(tool.count), sub: 'calls' })), [selectedSession])
  const sessionModels = React.useMemo(() => (selectedSession?.usage?.modelUsage ?? []).slice(0, 6).map((entry, index) => ({ label: entry.model || entry.provider || `${t('usage.modelMixFallback')} ${index + 1}`, value: formatCompact(entry.totals.totalTokens), sub: `${formatTokens(entry.totals.totalTokens)} tokens` })), [selectedSession, t])

  return (
    <div className="h-full flex-1 overflow-auto bg-background p-6 lg:p-8">
      <div className="mx-auto flex max-w-[1700px] flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:gap-5"><h1 className="text-3xl font-bold tracking-tight">{t('usage.title')}</h1><p className="text-sm text-muted-foreground lg:pb-1">{t('usage.subtitle')}</p></div>
          <div className="flex flex-wrap items-center gap-3">
            <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-11 w-[170px] rounded-2xl" />
            <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="h-11 w-[170px] rounded-2xl" />
            <Button variant="outline" className="rounded-2xl px-4" onClick={() => void refreshOverview(selectedSessionKey)} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}{t('usage.refresh')}</Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <SummaryCard icon={ScrollText} title={t('usage.cards.messages')} value={formatTokens(stats.messages)} hint={`${sessions.length} ${t('usage.cards.sessionsUnit')}`} />
          <SummaryCard icon={Wrench} title={t('usage.cards.toolCalls')} value={formatTokens(stats.toolCalls)} hint={`${overview?.usage?.aggregates?.tools?.uniqueTools ?? 0} ${t('usage.cards.toolsUnit')}`} />
          <SummaryCard icon={Activity} title={t('usage.cards.errors')} value={formatTokens(stats.errors)} hint={formatPercent(stats.errorRate)} />
          <SummaryCard icon={BarChart3} title={t('usage.cards.avgTokens')} value={formatCompact(stats.avgTokens)} hint={`${formatTokens(totals.totalTokens)} ${t('usage.tokensLabel')}`} />
          <SummaryCard icon={CalendarRange} title={t('usage.cards.sessions')} value={formatTokens(sessions.length)} hint={`${formatCompact(stats.throughput)} tok/min - ${formatPercent(stats.cacheHitRate)}`} />
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          <InsightList title={t('usage.insights.topModels')} items={topModels} empty={insightEmpty} />
          <InsightList title={t('usage.insights.topProviders')} items={topProviders} empty={insightEmpty} />
          <InsightList title={t('usage.insights.topTools')} items={topTools} empty={insightEmpty} />
          <InsightList title={t('usage.insights.topAgents')} items={topAgents} empty={insightEmpty} />
          <InsightList title={t('usage.insights.topChannels')} items={topChannels} empty={insightEmpty} />
          <InsightList title={t('usage.insights.peakErrorDays')} items={peakErrorDays} empty={insightEmpty} />
          <InsightList title={t('usage.insights.peakErrorHours')} items={peakErrorHours} empty={insightEmpty} />
        </div>

        <ActivityPanel sessions={sessions} t={t} />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_420px]">
          <Card className="app-subpanel rounded-[30px] shadow-none">
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-2xl font-black">{t('usage.overviewTitle')}</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-2xl border border-border/80 bg-muted/40 p-1">
                     <button type="button" className={cn('rounded-xl px-3 py-1.5 text-xs font-medium', dailyChartMode === 'total' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')} onClick={() => setDailyChartMode('total')}>{t('usage.chartModes.total')}</button>
                     <button type="button" className={cn('rounded-xl px-3 py-1.5 text-xs font-medium', dailyChartMode === 'byType' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')} onClick={() => setDailyChartMode('byType')}>{t('usage.chartModes.byType')}</button>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{t('usage.overviewHint')}</p>
            </CardHeader>
            <CardContent className="space-y-5">
              {daily.length ? <DailyChart daily={daily} chartMode={dailyChartMode} /> : <div className="text-sm text-muted-foreground">{t('usage.empty')}</div>}
              <BreakdownBar totals={totals} />
            </CardContent>
          </Card>

          <Card className="app-subpanel min-h-0 rounded-[30px] shadow-none">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-3"><CardTitle className="text-2xl font-black">{t('usage.sessionsTitle')}</CardTitle><div className="text-sm text-muted-foreground">{sessions.length} {t('usage.cards.sessionsUnit')}</div></div>
              <p className="text-sm text-muted-foreground">{t('usage.sessionsHint')}</p>
            </CardHeader>
            <CardContent className="min-h-[520px]">
              {loading ? (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('usage.loading')}</div>
              ) : sessions.length === 0 ? (
                 <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{t('usage.empty')}</div>
              ) : (
                <ScrollArea className="h-[520px] pr-3">
                   <div className="mb-4 flex flex-wrap gap-4 rounded-[24px] border border-border/80 bg-muted/35 p-4 text-sm text-foreground">
                    <div>{formatCompact(stats.avgTokens)} avg</div>
                    <div>{stats.errors} errors</div>
                    <div>{formatCompact(stats.throughput)} tok/min</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {sessions.map((session) => (
                      <button key={session.key} type="button" className={cn('rounded-2xl border px-4 py-4 text-left transition', selectedSessionKey === session.key ? 'border-primary/18 bg-primary/10 text-foreground dark:border-primary/24 dark:bg-primary/18 dark:text-primary-foreground' : 'border-border/80 bg-card/80 text-foreground hover:border-primary/14 hover:bg-primary/[0.04] dark:bg-card/65 dark:hover:border-primary/20 dark:hover:bg-primary/[0.08]')} onClick={() => setSelectedSessionKey(session.key)}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="break-words text-sm font-semibold leading-6">{getSessionTitle(session)}</div>
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span className="break-all">{session.key}</span>
                              <span>{session.channel || session.model || session.kind || '-'}</span>
                              <span>{formatRelativeTime(session.updatedAt)}</span>
                            </div>
                          </div>
                          <div className="shrink-0 text-sm font-semibold">{formatCompact(session.usage?.totalTokens ?? 0)}</div>
                        </div>
                        <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                          <div>{t('usage.sessionRow.messages')}: {session.usage?.messageCounts?.total ?? 0}</div>
                          <div>{t('usage.sessionRow.tools')}: {session.usage?.toolUsage?.totalCalls ?? 0}</div>
                          <div>{t('usage.sessionRow.errors')}: {session.usage?.messageCounts?.errors ?? 0}</div>
                          <div>{t('usage.sessionRow.duration')}: {formatDuration(session.usage?.durationMs ?? 0)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="app-subpanel rounded-[30px] shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-black">{t('usage.detailTitle')}</CardTitle>
            <p className="text-sm text-muted-foreground">{selectedSession ? getSessionTitle(selectedSession) : t('usage.detailHint')}</p>
          </CardHeader>
          <CardContent className="space-y-5">
            {!selectedSession ? (
               <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{t('usage.detailEmpty')}</div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
                  <div className="flex flex-wrap gap-2">{[selectedSession.channel, selectedSession.agentId, selectedSession.modelProvider || selectedSession.providerOverride, selectedSession.model].filter(Boolean).map((item) => <span key={item} className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">{item}</span>)}</div>
                  <div className="flex items-center gap-4 text-sm"><div><span className="font-bold text-foreground">{formatCompact(selectedSession.usage?.totalTokens ?? 0)}</span> {t('usage.tokensLabel')}</div></div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard icon={ScrollText} title={t('usage.cards.messages')} value={String(selectedSession.usage?.messageCounts?.total ?? 0)} hint={`${selectedSession.usage?.messageCounts?.user ?? 0} user - ${selectedSession.usage?.messageCounts?.assistant ?? 0} assistant`} />
                  <SummaryCard icon={Wrench} title={t('usage.cards.toolCalls')} value={String(selectedSession.usage?.toolUsage?.totalCalls ?? 0)} hint={`${selectedSession.usage?.toolUsage?.uniqueTools ?? 0} ${t('usage.cards.toolsUnit')}`} />
                  <SummaryCard icon={Activity} title={t('usage.cards.errors')} value={String(selectedSession.usage?.messageCounts?.errors ?? 0)} hint={`${selectedSession.usage?.messageCounts?.toolResults ?? 0} tool results`} />
                  <SummaryCard icon={CalendarRange} title={t('usage.sessionRow.duration')} value={formatDuration(selectedSession.usage?.durationMs ?? 0)} hint={`${selectedSession.usage?.firstActivity ? new Date(selectedSession.usage.firstActivity).toLocaleString() : '-'} - ${selectedSession.usage?.lastActivity ? new Date(selectedSession.usage.lastActivity).toLocaleString() : '-'}`} />
                </div>

                 <div className="grid gap-3 rounded-[24px] border border-border/80 bg-muted/35 p-4 text-sm text-foreground sm:grid-cols-2 xl:grid-cols-4">
                  <div><div className="text-xs text-muted-foreground">{t('usage.detail.channel')}</div><div className="mt-1 font-medium">{selectedSession.channel || '-'}</div></div>
                  <div><div className="text-xs text-muted-foreground">{t('usage.detail.model')}</div><div className="mt-1 break-words font-medium">{selectedSession.model || '-'}</div></div>
                  <div><div className="text-xs text-muted-foreground">{t('usage.detail.provider')}</div><div className="mt-1 break-words font-medium">{selectedSession.modelProvider || selectedSession.providerOverride || '-'}</div></div>
                  <div><div className="text-xs text-muted-foreground">{t('usage.detail.updatedAt')}</div><div className="mt-1 font-medium">{formatRelativeTime(selectedSession.updatedAt)}</div></div>
                </div>

                <div className="grid gap-5">
                  <InsightList title={t('usage.detail.topTools')} items={sessionTools} empty={insightEmpty} />
                  <InsightList title={t('usage.detail.modelMix')} items={sessionModels} empty={insightEmpty} />
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
                   <div className="rounded-[24px] border border-border/80 bg-muted/35 p-4">
                    <div className="mb-3 text-sm font-semibold text-foreground">{t('usage.detail.logs')}</div>
                    {detailLoading ? <div className="flex h-40 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('usage.loading')}</div> : logs.length ? (
                      <ScrollArea className="h-[360px] pr-3">
                        <div className="space-y-3">
                          {logs.map((log, index) => (
                             <div key={`${log.timestamp}-${index}`} className="rounded-2xl border border-border/80 bg-card/82 px-4 py-3 text-sm">
                              <div className="flex items-center justify-between gap-3"><div className="font-medium text-foreground">{getLogRoleLabel(log.role, t)}</div><div className="text-xs text-muted-foreground">{formatRelativeTime(log.timestamp)}</div></div>
                               <div className="mt-2 whitespace-pre-wrap break-words leading-7 text-foreground">{log.content}</div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">{t('usage.noLogs')}</div>}
                  </div>

                   <div className="rounded-[24px] border border-border/80 bg-muted/35 p-4">
                    <div className="mb-3 text-sm font-semibold text-foreground">{t('usage.detail.summary')}</div>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{t('usage.breakdown.input')}</span><span className="font-medium">{formatTokens(selectedSession.usage?.input ?? 0)}</span></div>
                      <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{t('usage.breakdown.output')}</span><span className="font-medium">{formatTokens(selectedSession.usage?.output ?? 0)}</span></div>
                      <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{t('usage.breakdown.cacheRead')}</span><span className="font-medium">{formatTokens(selectedSession.usage?.cacheRead ?? 0)}</span></div>
                      <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{t('usage.breakdown.cacheWrite')}</span><span className="font-medium">{formatTokens(selectedSession.usage?.cacheWrite ?? 0)}</span></div>
                      <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{t('usage.sessionRow.messages')}</span><span className="font-medium">{selectedSession.usage?.messageCounts?.total ?? 0}</span></div>
                      <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{t('usage.sessionRow.tokens')}</span><span className="font-medium">{formatTokens(selectedSession.usage?.totalTokens ?? 0)}</span></div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

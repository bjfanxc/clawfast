import type { CostUsageDailyEntry, UsageOverviewPayload, UsageSessionEntry, UsageTotals } from '../../../shared/usage'

export type UsageInsightItem = { label: string; value: string; sub: string }

export function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function formatTokens(value?: number | null) {
  return new Intl.NumberFormat('en-US').format(value ?? 0)
}

export function formatCompact(value?: number | null) {
  const amount = value ?? 0
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`
  return String(Math.round(amount))
}

export function formatPercent(value: number) {
  return `${value.toFixed(2)}%`
}

export function formatRelativeTime(timestamp?: number | null) {
  if (!timestamp) return '-'
  const diff = Math.max(0, Date.now() - timestamp)
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function formatDuration(durationMs?: number | null) {
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

export function getSessionTitle(session: UsageSessionEntry) {
  return session.label?.trim() || session.displayName || session.key
}

export function buildUsageTotals(totals?: UsageTotals | null) {
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

export function buildDailySeries(overview: UsageOverviewPayload | null) {
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

export function buildOverviewStats(sessions: UsageSessionEntry[], totals: ReturnType<typeof buildUsageTotals>) {
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

export function buildActivityStats(sessions: UsageSessionEntry[]) {
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

export function buildPeakErrorDays(sessions: UsageSessionEntry[]): UsageInsightItem[] {
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

export function buildPeakErrorHours(sessions: UsageSessionEntry[]): UsageInsightItem[] {
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

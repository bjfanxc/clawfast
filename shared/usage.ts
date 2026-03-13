export type UsageTotals = {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  totalTokens: number
  totalCost: number
  inputCost?: number
  outputCost?: number
  cacheReadCost?: number
  cacheWriteCost?: number
  missingCostEntries?: number
}

export type UsageMessageCounts = {
  total?: number
  user?: number
  assistant?: number
  toolCalls?: number
  toolResults?: number
  errors?: number
}

export type UsageToolEntry = {
  name: string
  count: number
}

export type UsageToolSummary = {
  totalCalls?: number
  uniqueTools?: number
  tools: UsageToolEntry[]
}

export type UsageModelSummaryEntry = {
  model?: string | null
  provider?: string | null
  totals: UsageTotals
}

export type UsageSessionEntry = {
  key: string
  label?: string | null
  displayName?: string | null
  agentId?: string | null
  channel?: string | null
  model?: string | null
  modelProvider?: string | null
  providerOverride?: string | null
  updatedAt?: number | null
  kind?: string | null
  contextWeight?: number | null
  usage?: {
    input: number
    output: number
    cacheRead: number
    cacheWrite: number
    totalTokens: number
    totalCost: number
    inputCost?: number
    outputCost?: number
    cacheReadCost?: number
    cacheWriteCost?: number
    missingCostEntries?: number
    durationMs?: number | null
    firstActivity?: number | null
    lastActivity?: number | null
    activityDates?: string[]
    messageCounts?: UsageMessageCounts
    toolUsage?: UsageToolSummary
    modelUsage?: UsageModelSummaryEntry[]
  } | null
}

export type UsageAggregateNamedTotals = {
  key?: string | null
  label?: string | null
  provider?: string | null
  model?: string | null
  count?: number
  totals: UsageTotals
}

export type UsageAggregates = {
  byProvider?: UsageAggregateNamedTotals[]
  byModel?: UsageAggregateNamedTotals[]
  byChannel?: UsageAggregateNamedTotals[]
  byAgent?: UsageAggregateNamedTotals[]
  tools?: {
    totalCalls?: number
    uniqueTools?: number
    tools: UsageToolEntry[]
  }
}

export type CostUsageDailyEntry = UsageTotals & {
  date: string
}

export type SessionsUsageResult = {
  updatedAt?: number
  startDate?: string
  endDate?: string
  sessions: UsageSessionEntry[]
  sessionsLimitReached?: boolean
  totals: UsageTotals | null
  aggregates: UsageAggregates | null
  costDaily?: CostUsageDailyEntry[]
}

export type CostUsageSummary = {
  updatedAt: number
  days: number
  daily: CostUsageDailyEntry[]
  totals: UsageTotals
}

export type SessionUsageTimePoint = {
  timestamp: number
  input?: number
  output?: number
  cacheRead?: number
  cacheWrite?: number
  totalTokens?: number
  cost?: number
}

export type SessionUsageTimeSeries = {
  key: string
  points: SessionUsageTimePoint[]
}

export type SessionLogEntry = {
  timestamp: number
  role: 'user' | 'assistant' | 'tool' | 'toolResult'
  content: string
  tokens?: number
  cost?: number
}

export type UsageDateMode = 'local' | 'utc'

export type UsageQueryPayload = {
  startDate: string
  endDate: string
  timeZone?: UsageDateMode
}

export type UsageOverviewPayload = {
  usage: SessionsUsageResult | null
  costSummary: CostUsageSummary | null
  startDate: string
  endDate: string
  timeZone: UsageDateMode
}


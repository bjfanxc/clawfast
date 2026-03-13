export type CronSchedule =
  | { kind: 'at'; at: string }
  | { kind: 'every'; everyMs: number; anchorMs?: number }
  | { kind: 'cron'; expr: string; tz?: string; staggerMs?: number }

export type CronSessionTarget = 'main' | 'isolated'
export type CronWakeMode = 'next-heartbeat' | 'now'

export type CronPayload =
  | { kind: 'systemEvent'; text: string }
  | {
      kind: 'agentTurn'
      message: string
      model?: string
      thinking?: string
      timeoutSeconds?: number
      lightContext?: boolean
    }

export type CronDelivery = {
  mode: 'none' | 'announce' | 'webhook'
  channel?: string
  to?: string
  accountId?: string
  bestEffort?: boolean
}

export type CronFailureAlert = {
  after?: number
  channel?: string
  to?: string
  cooldownMs?: number
  mode?: 'announce' | 'webhook'
  accountId?: string
}

export type CronJobState = {
  nextRunAtMs?: number
  runningAtMs?: number
  lastRunAtMs?: number
  lastStatus?: 'ok' | 'error' | 'skipped'
  lastError?: string
  lastDurationMs?: number
  lastFailureAlertAtMs?: number
}

export type CronJob = {
  id: string
  name: string
  description?: string
  agentId?: string | null
  sessionKey?: string | null
  enabled: boolean
  deleteAfterRun?: boolean
  schedule: CronSchedule
  sessionTarget: CronSessionTarget
  wakeMode: CronWakeMode
  payload: CronPayload
  delivery?: CronDelivery
  failureAlert?: CronFailureAlert | false
  createdAtMs?: number
  updatedAtMs?: number
  state?: CronJobState
}

export type CronStatus = {
  enabled: boolean
  jobs: number
  nextWakeAtMs?: number | null
  storePath?: string
}

export type CronModelsList = {
  models?: Array<{
    id?: string
    name?: string
    provider?: string
    contextWindow?: number
    reasoning?: boolean
    input?: string[]
  }>
}

export type CronJobsListResult = {
  jobs?: CronJob[]
  total?: number
  offset?: number
  limit?: number
  hasMore?: boolean
  nextOffset?: number | null
}

export type CronDraft = {
  id?: string | null
  name: string
  description?: string
  enabled: boolean
  deleteAfterRun?: boolean
  agentId?: string | null
  sessionKey?: string | null
  schedule: CronSchedule
  sessionTarget: CronSessionTarget
  wakeMode: CronWakeMode
  payload: CronPayload
  delivery?: CronDelivery
}

export type CronRunMode = 'force' | 'due'

export type CronSnapshot = {
  status: CronStatus | null
  jobs: CronJob[]
  total: number
  hasMore: boolean
  nextOffset: number | null
  modelSuggestions: string[]
}

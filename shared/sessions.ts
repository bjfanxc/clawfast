export interface SessionOrigin {
  label?: string
  provider?: string
  surface?: string
  chatType?: string
  from?: string
  to?: string
  accountId?: string
}

export interface SessionDeliveryContext {
  channel?: string
  to?: string
  accountId?: string
}

export interface SessionListEntry {
  key: string
  kind?: string
  label?: string
  displayName?: string
  chatType?: string
  origin?: SessionOrigin
  updatedAt?: number
  sessionId?: string
  systemSent?: boolean
  abortedLastRun?: boolean
  thinkingLevel?: string | null
  verboseLevel?: string | null
  reasoningLevel?: string | null
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  totalTokensFresh?: boolean
  modelProvider?: string
  model?: string
  contextTokens?: number
  deliveryContext?: SessionDeliveryContext
  lastChannel?: string
  lastTo?: string
  lastAccountId?: string
}

export interface SessionsListPayload {
  ts?: number
  path?: string
  count?: number
  defaults?: {
    modelProvider?: string
    model?: string
    contextTokens?: number
  }
  sessions: SessionListEntry[]
}

export interface SessionsPatchPayload {
  key: string
  label?: string | null
  thinkingLevel?: string | null
  verboseLevel?: string | null
  reasoningLevel?: string | null
}

export interface SessionsDeletePayload {
  key: string
  deleteTranscript?: boolean
}

export interface ChannelUiMetaEntry {
  id: string
  label: string
  detailLabel: string
  systemImage?: string
}

export interface ChannelAccountSnapshot {
  accountId: string
  name?: string | null
  enabled?: boolean | null
  configured?: boolean | null
  linked?: boolean | null
  running?: boolean | null
  connected?: boolean | null
  reconnectAttempts?: number | null
  lastConnectedAt?: number | null
  lastError?: string | null
  lastStartAt?: number | null
  lastStopAt?: number | null
  lastInboundAt?: number | null
  lastOutboundAt?: number | null
  lastProbeAt?: number | null
  mode?: string | null
  dmPolicy?: string | null
  allowFrom?: string[] | null
  tokenSource?: string | null
  botTokenSource?: string | null
  appTokenSource?: string | null
  credentialSource?: string | null
  audienceType?: string | null
  audience?: string | null
  webhookPath?: string | null
  webhookUrl?: string | null
  baseUrl?: string | null
  allowUnmentionedGroups?: boolean | null
  cliPath?: string | null
  dbPath?: string | null
  port?: number | null
  probe?: unknown
  audit?: unknown
  application?: unknown
  profile?: unknown
}

export interface ChannelsStatusSnapshot {
  ts: number
  channelOrder: string[]
  channelLabels: Record<string, string>
  channelDetailLabels?: Record<string, string>
  channelSystemImages?: Record<string, string>
  channelMeta?: ChannelUiMetaEntry[]
  channels: Record<string, unknown>
  channelAccounts: Record<string, ChannelAccountSnapshot[]>
  channelDefaultAccountId: Record<string, string>
}

export interface ChannelsSnapshot {
  snapshot: ChannelsStatusSnapshot | null
  lastSuccessAt: number | null
}

export interface ListChannelsOptions {
  probe?: boolean
}

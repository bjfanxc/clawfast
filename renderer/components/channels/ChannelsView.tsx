'use client'

import React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import JSON5 from 'json5'
import Image from 'next/image'
import {
  Bot,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  CloudLightning,
  Gamepad2,
  Loader2,
  LockKeyhole,
  Save,
  Plus,
  Power,
  Radio,
  RefreshCw,
  Send,
  Smartphone,
  Unplug,
  MessageSquareText,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { loadChannelsSnapshot } from '@/domain/channels/channels-service'
import { loadConfigSnapshot, saveConfigSnapshot } from '@/domain/config/config-service'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/store/toast-store'
import { useTranslation } from 'react-i18next'
import type { ChannelAccountSnapshot, ChannelUiMetaEntry, ChannelsSnapshot } from '../../../shared/channels'
import type { ConfigSnapshot } from '../../../shared/config'

type DerivedChannelCard = {
  id: string
  label: string
  detailLabel: string
  configured: boolean
  running: boolean
  accountCount: number
  lastError: string | null
  status: 'running' | 'configured' | 'idle'
  tokenSource: string | null
  mode: string | null
  botId: string | null
  botUsername: string | null
  canJoinGroups: boolean | null
  canReadAllGroupMessages: boolean | null
  defaultAccountId: string | null
  lastProbeAt: number | null
}

type ChannelType = 'telegram' | 'discord' | 'whatsapp' | 'dingtalk' | 'feishu'

type TelegramDraft = {
  enabled: boolean
  botToken: string
  dmPolicy: string
  groupPolicy: string
  allowFrom: string
}

type DiscordDraft = {
  enabled: boolean
  token: string
  guildId: string
  channelId: string
  dmPolicy: string
  allowFrom: string
}

type WhatsAppDraft = {
  enabled: boolean
  accountId: string
  name: string
  authDir: string
  defaultTo: string
  dmPolicy: string
  groupPolicy: string
  allowFrom: string
}

type DingTalkDraft = {
  enabled: boolean
  accountId: string
  name: string
  clientId: string
  clientSecret: string
  robotCode: string
  dmPolicy: string
  groupPolicy: string
  allowFrom: string
}

type FeishuDraft = {
  enabled: boolean
  accountId: string
  appId: string
  appSecret: string
  name: string
  domain: string
  dmPolicy: string
  groupPolicy: string
  verificationToken: string
  allowFrom: string
}

type ChannelDraftMap = {
  telegram: TelegramDraft
  discord: DiscordDraft
  whatsapp: WhatsAppDraft
  dingtalk: DingTalkDraft
  feishu: FeishuDraft
}

type ChannelPreset = {
  id: ChannelType
  label: string
  detailLabel: string
}

const DM_POLICY_OPTIONS = ['pairing', 'allowlist', 'open'] as const
const GROUP_POLICY_OPTIONS = ['open', 'allowlist', 'disabled'] as const

function coerceRecord(value: unknown) {
  if (!value || typeof value !== 'object') {
    return null
  }

  return value as Record<string, unknown>
}

function boolOrNull(value: unknown) {
  return typeof value === 'boolean' ? value : null
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

function numberOrNull(value: unknown) {
  return typeof value === 'number' ? value : null
}

function booleanOrNull(value: unknown) {
  return typeof value === 'boolean' ? value : null
}

function getChannelIconAsset(channelId: string) {
  switch (channelId) {
    case 'telegram':
    case 'discord':
    case 'whatsapp':
    case 'dingtalk':
    case 'feishu':
      return `/images/channel/${channelId}.svg`
    default:
      return null
  }
}

function coerceStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []
}

function parseCsvList(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function stringifyCsvList(value: unknown) {
  return coerceStringArray(value).join(', ')
}

function ensurePluginAllowed(base: Record<string, unknown>, pluginId: string) {
  const plugins = coerceRecord(base.plugins) ?? {}
  const allow = Array.isArray(plugins.allow) ? plugins.allow.filter((item): item is string => typeof item === 'string') : []
  if (!allow.includes(pluginId)) {
    allow.push(pluginId)
  }

  setPathValue(base, ['plugins'], {
    ...plugins,
    enabled: true,
    allow,
  })
}

function getChannelPresets(
  t: ReturnType<typeof useTranslation>['t'],
  isZh: boolean,
): ChannelPreset[] {
  return [
    {
      id: 'telegram',
      label: 'Telegram',
      detailLabel: t(
        'channels.telegram.detailLabel',
        isZh ? 'Bot Token、私聊/群聊策略与允许名单配置。' : 'Bot token, private/group policies, and allowlist setup.',
      ),
    },
    {
      id: 'discord',
      label: 'Discord',
      detailLabel: t(
        'channels.discord.detailLabel',
        isZh ? 'Bot Token、服务器/频道路由与私聊限制。' : 'Bot token, guild/channel routing, and DM restrictions.',
      ),
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      detailLabel: t(
        'channels.whatsapp.detailLabel',
        isZh ? '会话账号、认证目录与默认发送目标。' : 'Session account, auth directory, and default delivery target.',
      ),
    },
    {
      id: 'dingtalk',
      label: t('channels.dingtalk.name', isZh ? '钉钉' : 'DingTalk'),
      detailLabel: t(
        'channels.dingtalk.detailLabel',
        isZh ? '客户端凭证、机器人编码与策略控制。' : 'Client credentials, robot code, and policy controls.',
      ),
    },
    {
      id: 'feishu',
      label: t('channels.feishu.name'),
      detailLabel: t(
        'channels.feishu.detailLabel',
        isZh ? '应用凭证、域名模式与 webhook 校验令牌。' : 'App credentials, domain mode, and webhook verification token.',
      ),
    },
  ]
}

function getChannelIcon(channelId: string) {
  switch (channelId) {
    case 'telegram':
      return Send
    case 'discord':
      return Gamepad2
    case 'whatsapp':
      return Smartphone
    case 'dingtalk':
      return MessageSquareText
    case 'feishu':
    case 'lark':
      return MessageSquareText
    case 'slack':
      return BriefcaseBusiness
    case 'signal':
      return Radio
    case 'googlechat':
      return MessageSquareText
    case 'imessage':
      return MessageSquareText
    default:
      return null
  }
}

function deriveChannelCard(
  meta: ChannelUiMetaEntry,
  channels: Record<string, unknown>,
  channelAccounts: Record<string, ChannelAccountSnapshot[]>,
  defaultAccountIds: Record<string, string>,
): DerivedChannelCard {
  const status = coerceRecord(channels[meta.id])
  const accounts = channelAccounts[meta.id] ?? []
  const accountRunning = accounts.some((account) => account.running === true)
  const accountConfigured = accounts.some((account) => account.configured === true)
  const accountError = accounts.find((account) => account.lastError)?.lastError ?? null
  const configured = boolOrNull(status?.configured) ?? accountConfigured
  const running = boolOrNull(status?.running) ?? accountRunning
  const probe = coerceRecord(status?.probe)
  const bot = coerceRecord(probe?.bot)
  const firstAccount = accounts[0]
  const accountWithBotProbe =
    accounts.find((account) => {
      const accountProbe = coerceRecord(account.probe)
      return coerceRecord(accountProbe?.bot) !== null
    }) ?? null
  const accountProbe = coerceRecord(accountWithBotProbe?.probe)
  const accountBot = coerceRecord(accountProbe?.bot)

  let derivedStatus: DerivedChannelCard['status'] = 'idle'
  if (running) {
    derivedStatus = 'running'
  } else if (configured) {
    derivedStatus = 'configured'
  }

  return {
    id: meta.id,
    label: meta.label,
    detailLabel: meta.detailLabel,
    configured,
    running,
    accountCount: accounts.length,
    lastError: (typeof status?.lastError === 'string' ? status.lastError : null) ?? accountError,
    tokenSource: stringOrNull(status?.tokenSource) ?? stringOrNull(firstAccount?.tokenSource) ?? null,
    mode: stringOrNull(status?.mode) ?? stringOrNull(firstAccount?.mode) ?? null,
    botId: numberOrNull(bot?.id)?.toString() ?? numberOrNull(accountBot?.id)?.toString() ?? null,
    botUsername:
      stringOrNull(bot?.username) ??
      stringOrNull(accountBot?.username) ??
      stringOrNull(accountWithBotProbe?.name) ??
      stringOrNull(firstAccount?.name) ??
      null,
    canJoinGroups: booleanOrNull(bot?.canJoinGroups) ?? booleanOrNull(accountBot?.canJoinGroups),
    canReadAllGroupMessages:
      booleanOrNull(bot?.canReadAllGroupMessages) ?? booleanOrNull(accountBot?.canReadAllGroupMessages),
    defaultAccountId: stringOrNull(defaultAccountIds[meta.id]) ?? stringOrNull(firstAccount?.accountId) ?? null,
    lastProbeAt: numberOrNull(status?.lastProbeAt) ?? numberOrNull(firstAccount?.lastProbeAt) ?? null,
    status: derivedStatus,
  }
}

function getChannelStatusTone(status: DerivedChannelCard['status']) {
  switch (status) {
    case 'running':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
    case 'configured':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200'
    default:
      return 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-100'
  }
}

function getChannelStatusLabel(
  status: DerivedChannelCard['status'],
  t: ReturnType<typeof useTranslation>['t'],
) {
  switch (status) {
    case 'running':
      return t('channels.running')
    case 'configured':
      return t('channels.configured')
    default:
      return t('channels.idle')
  }
}

function formatTimestamp(timestamp: number | null) {
  if (!timestamp) {
    return null
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function formatBooleanFlag(value: boolean | null, t: ReturnType<typeof useTranslation>['t']) {
  if (value === null) {
    return '-'
  }

  return value ? t('channels.booleanYes') : t('channels.booleanNo')
}

function ChannelIcon({ channelId }: { channelId: string }) {
  const iconAsset = getChannelIconAsset(channelId)
  const Icon = getChannelIcon(channelId)

  if (iconAsset) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-card/95 shadow-[0_18px_35px_-28px_rgba(37,99,235,0.35)]">
        <Image src={iconAsset} alt={channelId} width={28} height={28} className="h-7 w-7 object-contain" />
      </div>
    )
  }

  if (Icon) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/30 dark:text-blue-200 dark:ring-blue-900/60">
        <Icon className="h-7 w-7" />
      </div>
    )
  }

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
      <Bot className="h-6 w-6" />
    </div>
  )
}

function ChannelInfoStat({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 px-3 py-2">
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/80">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  )
}

function parseJson(raw: string) {
  try {
    const parsed = JSON5.parse(raw) as Record<string, unknown>
    return { ok: true as const, value: parsed }
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : String(err) }
  }
}

function stringifyConfig(value: Record<string, unknown>) {
  return JSON5.stringify(value, null, 2)
}

function getPathValue(obj: Record<string, unknown>, path: string[]) {
  let cursor: unknown = obj
  for (const key of path) {
    if (!cursor || typeof cursor !== 'object' || Array.isArray(cursor)) {
      return undefined
    }
    cursor = (cursor as Record<string, unknown>)[key]
  }
  return cursor
}

function setPathValue(obj: Record<string, unknown>, path: string[], value: unknown) {
  let cursor: Record<string, unknown> = obj
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i]
    const next = cursor[key]
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      cursor[key] = {}
    }
    cursor = cursor[key] as Record<string, unknown>
  }
  cursor[path[path.length - 1]] = value
}

function getChannelConfig(config: Record<string, unknown> | null, channelId: string) {
  if (!config) {
    return null
  }

  const nested = getPathValue(config, ['channels', channelId])
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>
  }

  const fallback = config[channelId]
  if (fallback && typeof fallback === 'object' && !Array.isArray(fallback)) {
    return fallback as Record<string, unknown>
  }

  return null
}

function buildTelegramDraft(config: Record<string, unknown> | null): TelegramDraft {
  const channel = getChannelConfig(config, 'telegram')
  return {
    enabled: typeof channel?.enabled === 'boolean' ? channel.enabled : true,
    botToken: typeof channel?.botToken === 'string' ? channel.botToken : '',
    dmPolicy: typeof channel?.dmPolicy === 'string' ? channel.dmPolicy : 'pairing',
    groupPolicy: typeof channel?.groupPolicy === 'string' ? channel.groupPolicy : 'open',
    allowFrom: stringifyCsvList(channel?.allowFrom),
  }
}

function createEmptyTelegramDraft(): TelegramDraft {
  return {
    enabled: true,
    botToken: '',
    dmPolicy: 'pairing',
    groupPolicy: 'open',
    allowFrom: '',
  }
}

function buildDiscordDraft(config: Record<string, unknown> | null): DiscordDraft {
  const channel = getChannelConfig(config, 'discord')
  const guilds = coerceRecord(channel?.guilds) ?? {}
  const guildId = Object.keys(guilds)[0] ?? ''
  const guildConfig = coerceRecord(guilds[guildId]) ?? {}
  const channels = coerceRecord(guildConfig.channels) ?? {}
  const channelId = Object.keys(channels).find((key) => key !== '*') ?? ''
  const dm = coerceRecord(channel?.dm)

  return {
    enabled: typeof channel?.enabled === 'boolean' ? channel.enabled : true,
    token: typeof channel?.token === 'string' ? channel.token : '',
    guildId,
    channelId,
    dmPolicy: typeof dm?.policy === 'string' ? dm.policy : 'allowlist',
    allowFrom: stringifyCsvList(dm?.allowFrom),
  }
}

function createEmptyDiscordDraft(): DiscordDraft {
  return {
    enabled: true,
    token: '',
    guildId: '',
    channelId: '',
    dmPolicy: 'allowlist',
    allowFrom: '',
  }
}

function buildWhatsAppDraft(config: Record<string, unknown> | null): WhatsAppDraft {
  const channel = getChannelConfig(config, 'whatsapp')
  const accounts = coerceRecord(channel?.accounts) ?? {}
  const accountId = (typeof channel?.defaultAccount === 'string' && channel.defaultAccount) || Object.keys(accounts)[0] || 'main'
  const account = coerceRecord(accounts[accountId]) ?? {}

  return {
    enabled: typeof channel?.enabled === 'boolean' ? channel.enabled : true,
    accountId,
    name: typeof account.name === 'string' ? account.name : '',
    authDir: typeof account.authDir === 'string' ? account.authDir : '',
    defaultTo: typeof channel?.defaultTo === 'string' ? channel.defaultTo : '',
    dmPolicy: typeof channel?.dmPolicy === 'string' ? channel.dmPolicy : 'pairing',
    groupPolicy: typeof channel?.groupPolicy === 'string' ? channel.groupPolicy : 'allowlist',
    allowFrom: stringifyCsvList(channel?.allowFrom),
  }
}

function createEmptyWhatsAppDraft(): WhatsAppDraft {
  return {
    enabled: true,
    accountId: 'main',
    name: '',
    authDir: '',
    defaultTo: '',
    dmPolicy: 'pairing',
    groupPolicy: 'allowlist',
    allowFrom: '',
  }
}

function buildDingTalkDraft(config: Record<string, unknown> | null): DingTalkDraft {
  const channel = getChannelConfig(config, 'dingtalk')
  const accounts = coerceRecord(channel?.accounts) ?? {}
  const accountId =
    (typeof channel?.defaultAccount === 'string' && channel.defaultAccount) || Object.keys(accounts)[0] || 'main'
  const account = coerceRecord(accounts[accountId]) ?? channel

  return {
    enabled: typeof channel?.enabled === 'boolean' ? channel.enabled : true,
    accountId,
    name: typeof account?.name === 'string' ? account.name : '',
    clientId: typeof account?.clientId === 'string' ? account.clientId : '',
    clientSecret: typeof account?.clientSecret === 'string' ? account.clientSecret : '',
    robotCode: typeof account?.robotCode === 'string' ? account.robotCode : '',
    dmPolicy: typeof channel?.dmPolicy === 'string' ? channel.dmPolicy : 'pairing',
    groupPolicy: typeof channel?.groupPolicy === 'string' ? channel.groupPolicy : 'allowlist',
    allowFrom: stringifyCsvList(channel?.allowFrom),
  }
}

function createEmptyDingTalkDraft(): DingTalkDraft {
  return {
    enabled: true,
    accountId: 'main',
    name: '',
    clientId: '',
    clientSecret: '',
    robotCode: '',
    dmPolicy: 'pairing',
    groupPolicy: 'allowlist',
    allowFrom: '',
  }
}

function buildFeishuDraft(config: Record<string, unknown> | null): FeishuDraft {
  const channel = getChannelConfig(config, 'feishu')
  const accounts = coerceRecord(channel?.accounts) ?? {}
  const accountId = Object.keys(accounts)[0] ?? 'main'
  const account = coerceRecord(accounts[accountId])

  return {
    enabled: typeof channel?.enabled === 'boolean' ? channel.enabled : true,
    accountId,
    appId: typeof account?.appId === 'string' ? account.appId : '',
    appSecret: typeof account?.appSecret === 'string' ? account.appSecret : '',
    name: typeof account?.name === 'string' ? account.name : '',
    domain:
      (typeof account?.domain === 'string' && account.domain) ||
      (typeof channel?.domain === 'string' && channel.domain) ||
      'feishu',
    dmPolicy: typeof channel?.dmPolicy === 'string' ? channel.dmPolicy : 'pairing',
    groupPolicy: typeof channel?.groupPolicy === 'string' ? channel.groupPolicy : 'open',
    verificationToken: typeof channel?.verificationToken === 'string' ? channel.verificationToken : '',
    allowFrom: stringifyCsvList(channel?.allowFrom),
  }
}

function createEmptyFeishuDraft(): FeishuDraft {
  return {
    enabled: true,
    accountId: 'main',
    appId: '',
    appSecret: '',
    name: '',
    domain: 'feishu',
    dmPolicy: 'pairing',
    groupPolicy: 'open',
    verificationToken: '',
    allowFrom: '',
  }
}

function mergeTelegramConfig(base: Record<string, unknown>, draft: TelegramDraft) {
  const existing = getChannelConfig(base, 'telegram') ?? {}
  const next = { ...existing }
  next.enabled = draft.enabled
  next.botToken = draft.botToken.trim()
  next.dmPolicy = draft.dmPolicy
  next.groupPolicy = draft.groupPolicy
  next.allowFrom = parseCsvList(draft.allowFrom)
  setPathValue(base, ['channels', 'telegram'], next)
  setPathValue(base, ['plugins', 'entries', 'telegram', 'enabled'], true)
}

function mergeDiscordConfig(base: Record<string, unknown>, draft: DiscordDraft) {
  const existing = getChannelConfig(base, 'discord') ?? {}
  const next = { ...existing } as Record<string, unknown>
  const guildId = draft.guildId.trim()
  const channelId = draft.channelId.trim()

  next.enabled = draft.enabled
  next.token = draft.token.trim()
  next.groupPolicy = 'allowlist'
  next.retry = {
    attempts: 3,
    minDelayMs: 500,
    maxDelayMs: 30000,
    jitter: 0.1,
  }
  next.dm = {
    enabled: draft.dmPolicy !== 'disabled',
    policy: draft.dmPolicy,
    allowFrom: parseCsvList(draft.allowFrom),
  }

  if (guildId) {
    next.guilds = {
      [guildId]: {
        users: ['*'],
        requireMention: true,
        channels: {
          [channelId || '*']: {
            allow: true,
            requireMention: true,
          },
        },
      },
    }
  } else {
    delete next.guilds
  }

  setPathValue(base, ['channels', 'discord'], next)
  setPathValue(base, ['plugins', 'entries', 'discord', 'enabled'], true)
}

function mergeWhatsAppConfig(base: Record<string, unknown>, draft: WhatsAppDraft) {
  const existing = getChannelConfig(base, 'whatsapp') ?? {}
  const next = { ...existing } as Record<string, unknown>
  const accountId = draft.accountId.trim() || 'main'
  const accounts = coerceRecord(next.accounts) ?? {}
  const currentAccount = { ...(coerceRecord(accounts[accountId]) ?? {}) }

  next.enabled = draft.enabled
  next.defaultAccount = accountId
  next.dmPolicy = draft.dmPolicy
  next.groupPolicy = draft.groupPolicy
  next.allowFrom = parseCsvList(draft.allowFrom)

  if (draft.defaultTo.trim()) {
    next.defaultTo = draft.defaultTo.trim()
  } else {
    delete next.defaultTo
  }

  currentAccount.enabled = draft.enabled
  if (draft.name.trim()) {
    currentAccount.name = draft.name.trim()
  } else {
    delete currentAccount.name
  }
  if (draft.authDir.trim()) {
    currentAccount.authDir = draft.authDir.trim()
  } else {
    delete currentAccount.authDir
  }

  next.accounts = {
    ...accounts,
    [accountId]: currentAccount,
  }

  setPathValue(base, ['channels', 'whatsapp'], next)
  setPathValue(base, ['web', 'enabled'], true)
  setPathValue(base, ['plugins', 'entries', 'whatsapp', 'enabled'], true)
}

function mergeDingTalkConfig(base: Record<string, unknown>, draft: DingTalkDraft) {
  const existing = getChannelConfig(base, 'dingtalk') ?? {}
  const next = { ...existing } as Record<string, unknown>
  const accountId = draft.accountId.trim() || 'main'
  const accounts = coerceRecord(next.accounts) ?? {}
  const currentAccount = { ...(coerceRecord(accounts[accountId]) ?? {}) }

  next.enabled = draft.enabled
  next.defaultAccount = accountId
  next.dmPolicy = draft.dmPolicy
  next.groupPolicy = draft.groupPolicy
  next.allowFrom = parseCsvList(draft.allowFrom)

  currentAccount.enabled = draft.enabled
  currentAccount.clientId = draft.clientId.trim()
  currentAccount.clientSecret = draft.clientSecret.trim()

  if (draft.name.trim()) {
    currentAccount.name = draft.name.trim()
  } else {
    delete currentAccount.name
  }

  if (draft.robotCode.trim()) {
    currentAccount.robotCode = draft.robotCode.trim()
  } else {
    delete currentAccount.robotCode
  }

  next.accounts = {
    ...accounts,
    [accountId]: currentAccount,
  }

  setPathValue(base, ['channels', 'dingtalk'], next)
  ensurePluginAllowed(base, 'dingtalk')
}

function mergeFeishuConfig(base: Record<string, unknown>, draft: FeishuDraft) {
  const existing = getChannelConfig(base, 'feishu') ?? {}
  const next = { ...existing } as Record<string, unknown>
  const accountId = draft.accountId.trim() || 'main'
  const existingAccounts = { ...(coerceRecord(next.accounts) ?? {}) }
  const existingAccount = { ...(coerceRecord(existingAccounts[accountId]) ?? {}) }

  next.enabled = draft.enabled
  next.domain = draft.domain.trim() || 'feishu'
  next.dmPolicy = draft.dmPolicy
  next.groupPolicy = draft.groupPolicy
  next.allowFrom = parseCsvList(draft.allowFrom)

  if (draft.verificationToken.trim()) {
    next.verificationToken = draft.verificationToken.trim()
  } else {
    delete next.verificationToken
  }

  existingAccount.appId = draft.appId.trim()
  existingAccount.appSecret = draft.appSecret.trim()

  if (draft.name.trim()) {
    existingAccount.name = draft.name.trim()
  } else {
    delete existingAccount.name
  }

  if (draft.domain.trim()) {
    existingAccount.domain = draft.domain.trim()
  } else {
    delete existingAccount.domain
  }

  existingAccounts[accountId] = existingAccount
  next.defaultAccount = accountId
  next.accounts = existingAccounts
  setPathValue(base, ['channels', 'feishu'], next)
  setPathValue(base, ['plugins', 'entries', 'feishu', 'enabled'], true)
}

function ChannelField({
  label,
  hint,
  children,
}: React.PropsWithChildren<{
  label: string
  hint?: string
}>) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      {children}
      {hint ? <div className="text-xs leading-5 text-muted-foreground">{hint}</div> : null}
    </div>
  )
}

function ChannelSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: readonly string[]
}) {
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-2xl border px-4 text-left text-sm text-foreground outline-none transition',
          open ? 'border-primary/60 ring-2 ring-primary/15' : 'border-border/80',
          'bg-card',
        )}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{value}</span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition', open && 'rotate-180')} />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-border/90 bg-popover p-1 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.5)]">
          <div className="max-h-60 overflow-auto py-1" role="listbox">
            {options.map((option) => {
              const selected = option === value

              return (
                <button
                  key={option}
                  type="button"
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition',
                    selected ? 'bg-primary/10 text-foreground' : 'text-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                  onClick={() => {
                    onChange(option)
                    setOpen(false)
                  }}
                  role="option"
                  aria-selected={selected}
                >
                  <span>{option}</span>
                  {selected ? <Check className="h-4 w-4 text-primary" /> : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ChannelEnabledToggle({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
}) {
  return (
    <label className="app-dialog-subtle flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
      />
      {label}
    </label>
  )
}

export default function ChannelsView() {
  const { t, i18n } = useTranslation()
  const isZh = (i18n.resolvedLanguage ?? i18n.language ?? '').toLowerCase().startsWith('zh')
  const tx = React.useCallback(
    (key: string, zh: string, en: string) => t(key, isZh ? zh : en),
    [isZh, t],
  )
  const channelPresets = React.useMemo(() => getChannelPresets(t, isZh), [isZh, t])
  const [data, setData] = React.useState<ChannelsSnapshot | null>(null)
  const [configSnapshot, setConfigSnapshot] = React.useState<ConfigSnapshot | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [configLoading, setConfigLoading] = React.useState(false)
  const [configSaving, setConfigSaving] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [channelType, setChannelType] = React.useState<ChannelType>('telegram')
  const [telegramDraft, setTelegramDraft] = React.useState<TelegramDraft>(createEmptyTelegramDraft)
  const [discordDraft, setDiscordDraft] = React.useState<DiscordDraft>(createEmptyDiscordDraft)
  const [whatsAppDraft, setWhatsAppDraft] = React.useState<WhatsAppDraft>(createEmptyWhatsAppDraft)
  const [dingTalkDraft, setDingTalkDraft] = React.useState<DingTalkDraft>(createEmptyDingTalkDraft)
  const [feishuDraft, setFeishuDraft] = React.useState<FeishuDraft>(createEmptyFeishuDraft)
  const availableRef = React.useRef<HTMLDivElement | null>(null)
  const hasLoadedRef = React.useRef(false)
  const pushToast = useToastStore((state) => state.pushToast)

  const loadChannels = React.useCallback(async (probe = true) => {
    if (hasLoadedRef.current) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const snapshot = await loadChannelsSnapshot(probe)
      setData(snapshot)
      hasLoadedRef.current = true
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      pushToast('error', message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [pushToast])

  React.useEffect(() => {
    loadChannels(true)
  }, [loadChannels])

  const refreshConfig = React.useCallback(async (hydrateDrafts = true) => {
    setConfigLoading(true)
    try {
      const snapshot = await loadConfigSnapshot()
      setConfigSnapshot(snapshot)
      const rawText = typeof snapshot.raw === 'string' ? snapshot.raw : stringifyConfig(snapshot.config ?? {})
      const parsed = parseJson(rawText)
      if (!parsed.ok) {
        throw new Error(parsed.error)
      }
      if (hydrateDrafts) {
        setTelegramDraft(buildTelegramDraft(parsed.value))
        setDiscordDraft(buildDiscordDraft(parsed.value))
        setWhatsAppDraft(buildWhatsAppDraft(parsed.value))
        setDingTalkDraft(buildDingTalkDraft(parsed.value))
        setFeishuDraft(buildFeishuDraft(parsed.value))
      }
      return { snapshot, config: parsed.value }
    } finally {
      setConfigLoading(false)
    }
  }, [])

  const openAddDialog = async () => {
    setChannelType('telegram')
    setTelegramDraft(createEmptyTelegramDraft())
    setDiscordDraft(createEmptyDiscordDraft())
    setWhatsAppDraft(createEmptyWhatsAppDraft())
    setDingTalkDraft(createEmptyDingTalkDraft())
    setFeishuDraft(createEmptyFeishuDraft())
    setDialogOpen(true)
    try {
      await refreshConfig(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      pushToast('error', `${t('channels.configLoadFailed')}: ${message}`)
    }
  }

  const handleSaveChannel = async () => {
    if (!configSnapshot?.hash) {
      pushToast('error', t('channels.missingConfigHash'))
      return
    }

    if (channelType === 'telegram' && !telegramDraft.botToken.trim()) {
      pushToast('error', t('channels.telegram.botTokenRequired'))
      return
    }

    if (channelType === 'discord' && !discordDraft.token.trim()) {
      pushToast('error', tx('channels.discord.tokenRequired', '必须填写 Discord Bot Token', 'Discord bot token is required'))
      return
    }

    if (channelType === 'whatsapp' && !whatsAppDraft.accountId.trim()) {
      pushToast('error', tx('channels.whatsapp.accountIdRequired', '必须填写 WhatsApp 账号标识', 'WhatsApp account key is required'))
      return
    }

    if (channelType === 'dingtalk') {
      if (!dingTalkDraft.clientId.trim()) {
        pushToast('error', tx('channels.dingtalk.clientIdRequired', '必须填写钉钉 Client ID', 'DingTalk client ID is required'))
        return
      }
      if (!dingTalkDraft.clientSecret.trim()) {
        pushToast('error', tx('channels.dingtalk.clientSecretRequired', '必须填写钉钉 Client Secret', 'DingTalk client secret is required'))
        return
      }
    }

    if (channelType === 'feishu') {
      if (!feishuDraft.appId.trim()) {
        pushToast('error', t('channels.feishu.appIdRequired'))
        return
      }
      if (!feishuDraft.appSecret.trim()) {
        pushToast('error', t('channels.feishu.appSecretRequired'))
        return
      }
    }

    const rawText =
      typeof configSnapshot.raw === 'string' ? configSnapshot.raw : stringifyConfig(configSnapshot.config ?? {})
    const parsed = parseJson(rawText)
    if (!parsed.ok) {
      pushToast('error', `${t('channels.configLoadFailed')}: ${parsed.error}`)
      return
    }

    setConfigSaving(true)
    try {
      const base = { ...parsed.value }
      switch (channelType) {
        case 'telegram':
          mergeTelegramConfig(base, telegramDraft)
          break
        case 'discord':
          mergeDiscordConfig(base, discordDraft)
          break
        case 'whatsapp':
          mergeWhatsAppConfig(base, whatsAppDraft)
          break
        case 'dingtalk':
          mergeDingTalkConfig(base, dingTalkDraft)
          break
        case 'feishu':
          mergeFeishuConfig(base, feishuDraft)
          break
      }

      const nextRaw = stringifyConfig(base)
      const updated = await saveConfigSnapshot({
        raw: nextRaw,
        baseHash: configSnapshot.hash,
      })
      setConfigSnapshot(updated)
      setDialogOpen(false)
      pushToast('success', t('channels.saveSuccess'))
      await Promise.all([refreshConfig(), loadChannels(true)])
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      pushToast('error', `${t('channels.saveFailed')}: ${message}`)
    } finally {
      setConfigSaving(false)
    }
  }

  const snapshot = data?.snapshot
  const metaMap = new Map<string, ChannelUiMetaEntry>()
  ;(snapshot?.channelMeta ?? []).forEach((entry) => {
    metaMap.set(entry.id, entry)
  })
  channelPresets.forEach((entry) => {
    metaMap.set(entry.id, entry)
  })
  ;(snapshot?.channelOrder ?? []).forEach((id) => {
    if (!metaMap.has(id)) {
      metaMap.set(id, {
        id,
        label: snapshot?.channelLabels?.[id] ?? id,
        detailLabel: snapshot?.channelDetailLabels?.[id] ?? snapshot?.channelLabels?.[id] ?? id,
      })
    }
  })
  const meta = Array.from(metaMap.values())

  const channels = snapshot?.channels ?? {}
  const channelAccounts = snapshot?.channelAccounts ?? {}
  const defaultAccountIds = snapshot?.channelDefaultAccountId ?? {}
  const channelCards = meta.map((entry) => deriveChannelCard(entry, channels, channelAccounts, defaultAccountIds))
  const visibleChannelCards = channelCards.filter((entry) => entry.configured)

  const totalChannels = visibleChannelCards.length
  const configuredChannels = visibleChannelCards.length
  const runningChannels = visibleChannelCards.filter((entry) => entry.running).length

  return (
    <div className="h-full flex-1 overflow-auto bg-background p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:gap-5">
            <h1 className="text-3xl font-bold tracking-tight">{t('channels.title')}</h1>
            <p className="text-sm text-muted-foreground lg:pb-1">{t('channels.subtitle')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" className="gap-2" onClick={() => loadChannels(true)} disabled={refreshing}>
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              {t('channels.refresh')}
            </Button>
            <Button className="app-solid-primary gap-2" onClick={() => void openAddDialog()}>
              <Plus className="h-4 w-4" />
              {t('channels.add')}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-[28px] border-blue-100/80 shadow-sm dark:border-blue-950/50">
            <CardContent className="flex items-center gap-5 p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-200">
                <Radio className="h-7 w-7" />
              </div>
              <div>
                <div className="text-4xl font-bold">{totalChannels}</div>
                <div className="text-sm text-muted-foreground">{t('channels.stats.total')}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-emerald-100/80 shadow-sm dark:border-emerald-950/50">
            <CardContent className="flex items-center gap-5 p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-200">
                <Power className="h-7 w-7" />
              </div>
              <div>
                <div className="text-4xl font-bold">{configuredChannels}</div>
                <div className="text-sm text-muted-foreground">{t('channels.stats.configured')}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-blue-100/80 shadow-sm dark:border-blue-950/50">
            <CardContent className="flex items-center gap-5 p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-200">
                <Unplug className="h-7 w-7" />
              </div>
              <div>
                <div className="text-4xl font-bold">{runningChannels}</div>
                <div className="text-sm text-muted-foreground">{t('channels.stats.running')}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card ref={availableRef} className="rounded-[28px] border-border/80 shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-bold">{t('channels.connectedTitle')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('channels.connectedSubtitle')}</p>
          </CardHeader>

          <CardContent className="space-y-5">
            {loading ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-dashed border-border bg-muted/20">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  {t('channels.loading')}
                </div>
              </div>
            ) : null}

            {!loading && visibleChannelCards.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
                <CloudLightning className="mx-auto h-10 w-10 text-muted-foreground/60" />
                <h3 className="mt-4 text-lg font-semibold">{t('channels.emptyTitle')}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t('channels.emptyDescription')}</p>
              </div>
            ) : null}

            {!loading && visibleChannelCards.length > 0 ? (
              <div className="space-y-3">
                {visibleChannelCards.map((channel) => (
                  <Card key={channel.id} className="rounded-[24px] border-blue-100/70 bg-card/95 shadow-sm dark:border-blue-950/40">
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                          <ChannelIcon channelId={channel.id} />
                          <div className="min-w-0 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-xl font-semibold">{channel.label}</h3>
                              <span
                                className={cn(
                                  'rounded-full px-2.5 py-1 text-xs font-medium',
                                  getChannelStatusTone(channel.status)
                                )}
                              >
                                {getChannelStatusLabel(channel.status, t)}
                              </span>
                            </div>
                            <p className="text-sm leading-6 text-muted-foreground">{channel.detailLabel}</p>
                            <div className="flex flex-wrap gap-2">
                              {channel.accountCount > 0 ? (
                                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                  {t('channels.accountCount', { count: channel.accountCount })}
                                </span>
                              ) : null}
                              {channel.tokenSource ? (
                                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                  {t('channels.tokenSource', { value: channel.tokenSource })}
                                </span>
                              ) : null}
                              {channel.mode ? (
                                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                  {t('channels.mode', { value: channel.mode })}
                                </span>
                              ) : null}
                            </div>
                            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                              <ChannelInfoStat label="Bot ID" value={channel.botId ?? '-'} />
                              <ChannelInfoStat label={t('channels.botUsernameLabel')} value={channel.botUsername ?? '-'} />
                              <ChannelInfoStat
                                label={t('channels.canJoinGroupsLabel')}
                                value={formatBooleanFlag(channel.canJoinGroups, t)}
                              />
                              <ChannelInfoStat
                                label={t('channels.canReadAllGroupMessagesLabel')}
                                value={formatBooleanFlag(channel.canReadAllGroupMessages, t)}
                              />
                            </div>

                            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-3">
                              {channel.defaultAccountId ? (
                                <div>{t('channels.defaultAccount', { value: channel.defaultAccountId })}</div>
                              ) : null}
                              {channel.lastProbeAt ? (
                                <div>{t('channels.lastProbeAt', { value: formatTimestamp(channel.lastProbeAt) })}</div>
                              ) : null}
                            </div>
                            {channel.lastError ? (
                              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                                {channel.lastError}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="app-overlay-scrim fixed inset-0 z-50 backdrop-blur-sm" />
          <Dialog.Content className="app-dialog-shell fixed left-1/2 top-1/2 z-50 flex h-[min(88vh,860px)] w-[min(980px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[32px] outline-none">
            <div className="app-dialog-section flex shrink-0 items-start justify-between gap-4 border-b px-6 py-5">
              <div>
                <Dialog.Title className="text-xl font-semibold text-foreground">{t('channels.addTitle')}</Dialog.Title>
                <Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
                  {t(
                    'channels.addSubtitle',
                    isZh
                      ? '创建或更新 Telegram、Discord、WhatsApp、钉钉、飞书频道配置。'
                      : 'Create or update Telegram, Discord, WhatsApp, DingTalk, and Feishu channel configuration.',
                  )}
                </Dialog.Description>
              </div>
              <Button
                type="button"
                variant="outline"
                className="app-soft-button rounded-2xl"
                onClick={() => void refreshConfig(false)}
                disabled={configLoading}
              >
                {configLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {t('channels.refresh')}
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
              <div className="space-y-6">
                <div className="app-dialog-subtle rounded-[28px] p-3">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {channelPresets.map((entry) => {
                      const active = channelType === entry.id
                      const iconAsset = getChannelIconAsset(entry.id)
                      const Icon = getChannelIcon(entry.id) ?? Bot

                      return (
                        <button
                          key={entry.id}
                          type="button"
                          className={cn(
                            'group relative overflow-hidden rounded-[24px] px-4 py-4 text-left transition',
                            active ? 'app-selection-card-active' : 'app-selection-card',
                          )}
                          onClick={() => setChannelType(entry.id)}
                        >
                          <div
                            className={cn(
                              'pointer-events-none absolute inset-x-0 top-0 h-1 rounded-full opacity-0 transition',
                              active && 'opacity-100',
                            )}
                            style={{ background: 'linear-gradient(90deg, hsl(var(--primary) / 0.85), hsl(var(--accent) / 0.72))' }}
                          />
                          <div className="flex min-h-[68px] items-center gap-3">
                          <div
                            className={cn(
                              'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition',
                              active
                                  ? 'border-border/90 bg-card shadow-[0_16px_32px_-28px_rgba(15,23,42,0.22)]'
                                  : 'border-border/70 bg-card/85 text-muted-foreground',
                            )}
                          >
                              {iconAsset ? (
                                <Image
                                  src={iconAsset}
                                  alt={entry.label}
                                  width={26}
                                  height={26}
                                  className="h-6 w-6 object-contain"
                                />
                              ) : (
                                <Icon className="h-5 w-5" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
                              {entry.label}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                    })}
                  </div>
                </div>

                {configLoading ? (
                  <div className="app-dialog-code flex min-h-[280px] items-center justify-center rounded-[24px] px-6 text-sm text-muted-foreground">
                <Loader2 className="mr-3 h-4 w-4 animate-spin" />
                {t('channels.configLoading')}
                  </div>
                ) : null}

                {!configLoading && channelType === 'telegram' ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <ChannelField label={t('channels.telegram.botTokenLabel')} hint={t('channels.telegram.botTokenHint')}>
                        <Input
                          type="password"
                          value={telegramDraft.botToken}
                          onChange={(event) => setTelegramDraft((prev) => ({ ...prev, botToken: event.target.value }))}
                          placeholder={t('channels.telegram.botTokenPlaceholder')}
                          className="h-11 rounded-2xl"
                        />
                      </ChannelField>
                      <ChannelField
                        label={tx('channels.telegram.allowFromLabel', '允许用户', 'Allowed users')}
                        hint={tx('channels.telegram.allowFromHint', '使用逗号分隔用户 ID 或用户名。', 'Comma-separated user IDs or usernames.')}
                      >
                        <Input
                          value={telegramDraft.allowFrom}
                          onChange={(event) => setTelegramDraft((prev) => ({ ...prev, allowFrom: event.target.value }))}
                          placeholder={tx('channels.telegram.allowFromPlaceholder', '12345678, @alice', '12345678, @alice')}
                          className="h-11 rounded-2xl"
                        />
                      </ChannelField>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <ChannelField label={t('channels.form.dmPolicy')}>
                        <ChannelSelect
                          value={telegramDraft.dmPolicy}
                          onChange={(value) => setTelegramDraft((prev) => ({ ...prev, dmPolicy: value }))}
                          options={DM_POLICY_OPTIONS}
                        />
                      </ChannelField>
                      <ChannelField label={t('channels.form.groupPolicy')}>
                        <ChannelSelect
                          value={telegramDraft.groupPolicy}
                          onChange={(value) => setTelegramDraft((prev) => ({ ...prev, groupPolicy: value }))}
                          options={GROUP_POLICY_OPTIONS}
                        />
                      </ChannelField>
                    </div>
                    <ChannelEnabledToggle
                      checked={telegramDraft.enabled}
                      onCheckedChange={(checked) => setTelegramDraft((prev) => ({ ...prev, enabled: checked }))}
                      label={t('channels.form.enabled')}
                    />
                  </div>
                ) : null}

                {!configLoading && channelType === 'discord' ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <ChannelField label={tx('channels.discord.tokenLabel', 'Bot Token', 'Bot token')}>
                        <Input
                          type="password"
                          value={discordDraft.token}
                          onChange={(event) => setDiscordDraft((prev) => ({ ...prev, token: event.target.value }))}
                          placeholder={tx('channels.discord.tokenPlaceholder', 'Discord Bot Token', 'Discord bot token')}
                          className="h-11 rounded-2xl"
                        />
                      </ChannelField>
                      <ChannelField
                        label={tx('channels.discord.allowFromLabel', '允许私聊用户', 'Allowed DM users')}
                        hint={tx('channels.discord.allowFromHint', '可选，使用逗号分隔允许名单。', 'Optional comma-separated allowlist.')}
                      >
                        <Input
                          value={discordDraft.allowFrom}
                          onChange={(event) => setDiscordDraft((prev) => ({ ...prev, allowFrom: event.target.value }))}
                          placeholder={tx('channels.discord.allowFromPlaceholder', 'user_1, user_2', 'user_1, user_2')}
                          className="h-11 rounded-2xl"
                        />
                      </ChannelField>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <ChannelField label={tx('channels.discord.guildIdLabel', '服务器 ID', 'Guild ID')}>
                        <Input
                          value={discordDraft.guildId}
                          onChange={(event) => setDiscordDraft((prev) => ({ ...prev, guildId: event.target.value }))}
                          placeholder={tx('channels.discord.guildIdPlaceholder', '可选服务器 ID', 'Optional guild ID')}
                          className="h-11 rounded-2xl"
                        />
                      </ChannelField>
                      <ChannelField label={tx('channels.discord.channelIdLabel', '频道 ID', 'Channel ID')}>
                        <Input
                          value={discordDraft.channelId}
                          onChange={(event) => setDiscordDraft((prev) => ({ ...prev, channelId: event.target.value }))}
                          placeholder={tx('channels.discord.channelIdPlaceholder', '可选频道 ID', 'Optional channel ID')}
                          className="h-11 rounded-2xl"
                        />
                      </ChannelField>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <ChannelField label={t('channels.form.dmPolicy')}>
                        <ChannelSelect
                          value={discordDraft.dmPolicy}
                          onChange={(value) => setDiscordDraft((prev) => ({ ...prev, dmPolicy: value }))}
                          options={DM_POLICY_OPTIONS}
                        />
                      </ChannelField>
                      <div className="app-dialog-subtle rounded-2xl px-4 py-3 text-sm leading-6 text-muted-foreground">
                        {t(
                          'channels.discord.groupHint',
                          isZh ? 'Discord 群组路由固定为 allowlist，并默认要求 @ 提及。' : 'Discord guild routing follows allowlist mode and requires mention by default.',
                        )}
                      </div>
                    </div>
                    <ChannelEnabledToggle
                      checked={discordDraft.enabled}
                      onCheckedChange={(checked) => setDiscordDraft((prev) => ({ ...prev, enabled: checked }))}
                      label={t('channels.form.enabled')}
                    />
                  </div>
                ) : null}

                {!configLoading && channelType === 'whatsapp' ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <ChannelField label={tx('channels.whatsapp.accountIdLabel', '账号标识', 'Account key')}>
                        <Input
                          value={whatsAppDraft.accountId}
                          onChange={(event) => setWhatsAppDraft((prev) => ({ ...prev, accountId: event.target.value }))}
                          placeholder={tx('channels.whatsapp.accountIdPlaceholder', 'main', 'main')}
                          className="h-11 rounded-2xl"
                        />
                      </ChannelField>
                      <ChannelField label={tx('channels.whatsapp.nameLabel', '账号名称', 'Account name')}>
                        <Input
                          value={whatsAppDraft.name}
                          onChange={(event) => setWhatsAppDraft((prev) => ({ ...prev, name: event.target.value }))}
                          placeholder={tx('channels.whatsapp.namePlaceholder', '可选展示名称', 'Optional display name')}
                          className="h-11 rounded-2xl"
                        />
                      </ChannelField>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <ChannelField label={tx('channels.whatsapp.authDirLabel', '认证目录', 'Auth directory')}>
                        <Input
                          value={whatsAppDraft.authDir}
                          onChange={(event) => setWhatsAppDraft((prev) => ({ ...prev, authDir: event.target.value }))}
                          placeholder={tx('channels.whatsapp.authDirPlaceholder', '.openclaw/whatsapp/main', '.openclaw/whatsapp/main')}
                          className="h-11 rounded-2xl"
                        />
                      </ChannelField>
                      <ChannelField label={tx('channels.whatsapp.defaultToLabel', '默认发送目标', 'Default target')}>
                        <Input
                          value={whatsAppDraft.defaultTo}
                          onChange={(event) => setWhatsAppDraft((prev) => ({ ...prev, defaultTo: event.target.value }))}
                          placeholder={tx('channels.whatsapp.defaultToPlaceholder', '可选默认聊天目标', 'Optional default chat target')}
                          className="h-11 rounded-2xl"
                        />
                      </ChannelField>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <ChannelField label={t('channels.form.dmPolicy')}>
                        <ChannelSelect
                          value={whatsAppDraft.dmPolicy}
                          onChange={(value) => setWhatsAppDraft((prev) => ({ ...prev, dmPolicy: value }))}
                          options={DM_POLICY_OPTIONS}
                        />
                      </ChannelField>
                      <ChannelField label={t('channels.form.groupPolicy')}>
                        <ChannelSelect
                          value={whatsAppDraft.groupPolicy}
                          onChange={(value) => setWhatsAppDraft((prev) => ({ ...prev, groupPolicy: value }))}
                          options={GROUP_POLICY_OPTIONS}
                        />
                      </ChannelField>
                    </div>
                    <ChannelField
                      label={tx('channels.whatsapp.allowFromLabel', '允许联系人', 'Allowed contacts')}
                      hint={tx('channels.whatsapp.allowFromHint', '使用逗号分隔发送者 ID 或手机号。', 'Comma-separated sender IDs or phone numbers.')}
                    >
                      <Input
                        value={whatsAppDraft.allowFrom}
                        onChange={(event) => setWhatsAppDraft((prev) => ({ ...prev, allowFrom: event.target.value }))}
                        placeholder={tx('channels.whatsapp.allowFromPlaceholder', '8613xxxx, my-team', '8613xxxx, my-team')}
                        className="h-11 rounded-2xl"
                      />
                    </ChannelField>
                    <ChannelEnabledToggle
                      checked={whatsAppDraft.enabled}
                      onCheckedChange={(checked) => setWhatsAppDraft((prev) => ({ ...prev, enabled: checked }))}
                      label={t('channels.form.enabled')}
                    />
                  </div>
                ) : null}

                {!configLoading && channelType === 'dingtalk' ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <ChannelField label={tx('channels.dingtalk.accountIdLabel', '账号标识', 'Account key')}>
                        <Input
                          value={dingTalkDraft.accountId}
                          onChange={(event) => setDingTalkDraft((prev) => ({ ...prev, accountId: event.target.value }))}
                          placeholder={tx('channels.dingtalk.accountIdPlaceholder', 'main', 'main')}
                          className="h-11 rounded-2xl"
                        />
                      </ChannelField>
                      <ChannelField label={tx('channels.dingtalk.nameLabel', '账号名称', 'Account name')}>
                        <Input
                          value={dingTalkDraft.name}
                          onChange={(event) => setDingTalkDraft((prev) => ({ ...prev, name: event.target.value }))}
                          placeholder={tx('channels.dingtalk.namePlaceholder', '可选展示名称', 'Optional display name')}
                          className="h-11 rounded-2xl"
                        />
                      </ChannelField>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <ChannelField label={tx('channels.dingtalk.clientIdLabel', 'Client ID', 'Client ID')}>
                        <Input
                          value={dingTalkDraft.clientId}
                          onChange={(event) => setDingTalkDraft((prev) => ({ ...prev, clientId: event.target.value }))}
                          placeholder={tx('channels.dingtalk.clientIdPlaceholder', 'dingxxxx', 'dingxxxx')}
                          className="h-11 rounded-2xl"
                        />
                      </ChannelField>
                      <ChannelField label={tx('channels.dingtalk.clientSecretLabel', 'Client Secret', 'Client Secret')}>
                        <Input
                          type="password"
                          value={dingTalkDraft.clientSecret}
                          onChange={(event) => setDingTalkDraft((prev) => ({ ...prev, clientSecret: event.target.value }))}
                          placeholder={tx('channels.dingtalk.clientSecretPlaceholder', '请输入 Client Secret', 'Enter client secret')}
                          className="h-11 rounded-2xl"
                        />
                      </ChannelField>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <ChannelField
                        label={tx('channels.dingtalk.robotCodeLabel', '机器人编码', 'Robot code')}
                        hint={tx('channels.dingtalk.robotCodeHint', '使用自定义机器人时可选填写。', 'Optional when using a custom robot.')}
                      >
                        <Input
                          value={dingTalkDraft.robotCode}
                          onChange={(event) => setDingTalkDraft((prev) => ({ ...prev, robotCode: event.target.value }))}
                          placeholder={tx('channels.dingtalk.robotCodePlaceholder', '可选机器人编码', 'Optional robot code')}
                          className="h-11 rounded-2xl"
                        />
                      </ChannelField>
                      <ChannelField
                        label={tx('channels.dingtalk.allowFromLabel', '允许用户', 'Allowed users')}
                        hint={tx('channels.dingtalk.allowFromHint', '可选，使用逗号分隔钉钉用户 ID。', 'Optional comma-separated DingTalk user IDs.')}
                      >
                        <Input
                          value={dingTalkDraft.allowFrom}
                          onChange={(event) => setDingTalkDraft((prev) => ({ ...prev, allowFrom: event.target.value }))}
                          placeholder={tx('channels.dingtalk.allowFromPlaceholder', 'user001, user002', 'user001, user002')}
                          className="h-11 rounded-2xl"
                        />
                      </ChannelField>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <ChannelField label={t('channels.form.dmPolicy')}>
                        <ChannelSelect
                          value={dingTalkDraft.dmPolicy}
                          onChange={(value) => setDingTalkDraft((prev) => ({ ...prev, dmPolicy: value }))}
                          options={DM_POLICY_OPTIONS}
                        />
                      </ChannelField>
                      <ChannelField label={t('channels.form.groupPolicy')}>
                        <ChannelSelect
                          value={dingTalkDraft.groupPolicy}
                          onChange={(value) => setDingTalkDraft((prev) => ({ ...prev, groupPolicy: value }))}
                          options={GROUP_POLICY_OPTIONS}
                        />
                      </ChannelField>
                    </div>
                    <ChannelEnabledToggle
                      checked={dingTalkDraft.enabled}
                      onCheckedChange={(checked) => setDingTalkDraft((prev) => ({ ...prev, enabled: checked }))}
                      label={t('channels.form.enabled')}
                    />
                  </div>
                ) : null}

                {!configLoading && channelType === 'feishu' ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <ChannelField label={t('channels.feishu.accountIdLabel')} hint={t('channels.feishu.accountIdHint')}>
                        <Input
                          value={feishuDraft.accountId}
                          onChange={(event) => setFeishuDraft((prev) => ({ ...prev, accountId: event.target.value }))}
                          placeholder={t('channels.feishu.accountIdPlaceholder')}
                          className="h-11 rounded-2xl"
                        />
                      </ChannelField>
                      <ChannelField label={t('channels.feishu.nameLabel')}>
                        <Input
                          value={feishuDraft.name}
                          onChange={(event) => setFeishuDraft((prev) => ({ ...prev, name: event.target.value }))}
                          placeholder={t('channels.feishu.namePlaceholder')}
                          className="h-11 rounded-2xl"
                        />
                      </ChannelField>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <ChannelField label={t('channels.feishu.appIdLabel')}>
                        <Input
                          value={feishuDraft.appId}
                          onChange={(event) => setFeishuDraft((prev) => ({ ...prev, appId: event.target.value }))}
                          placeholder={t('channels.feishu.appIdPlaceholder')}
                          className="h-11 rounded-2xl"
                        />
                      </ChannelField>
                      <ChannelField label={t('channels.feishu.appSecretLabel')}>
                        <Input
                          type="password"
                          value={feishuDraft.appSecret}
                          onChange={(event) => setFeishuDraft((prev) => ({ ...prev, appSecret: event.target.value }))}
                          placeholder={t('channels.feishu.appSecretPlaceholder')}
                          className="h-11 rounded-2xl"
                        />
                      </ChannelField>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <ChannelField label={t('channels.feishu.domainLabel')}>
                        <ChannelSelect
                          value={feishuDraft.domain}
                          onChange={(value) => setFeishuDraft((prev) => ({ ...prev, domain: value }))}
                          options={['feishu', 'lark']}
                        />
                      </ChannelField>
                      <ChannelField label={t('channels.feishu.verificationTokenLabel')} hint={t('channels.feishu.verificationTokenHint')}>
                        <Input
                          value={feishuDraft.verificationToken}
                          onChange={(event) => setFeishuDraft((prev) => ({ ...prev, verificationToken: event.target.value }))}
                          placeholder={t('channels.feishu.verificationTokenPlaceholder')}
                          className="h-11 rounded-2xl"
                        />
                      </ChannelField>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <ChannelField label={t('channels.form.dmPolicy')}>
                        <ChannelSelect
                          value={feishuDraft.dmPolicy}
                          onChange={(value) => setFeishuDraft((prev) => ({ ...prev, dmPolicy: value }))}
                          options={DM_POLICY_OPTIONS}
                        />
                      </ChannelField>
                      <ChannelField label={t('channels.form.groupPolicy')}>
                        <ChannelSelect
                          value={feishuDraft.groupPolicy}
                          onChange={(value) => setFeishuDraft((prev) => ({ ...prev, groupPolicy: value }))}
                          options={GROUP_POLICY_OPTIONS}
                        />
                      </ChannelField>
                    </div>
                    <ChannelField
                      label={tx('channels.feishu.allowFromLabel', '允许用户', 'Allowed users')}
                      hint={tx('channels.feishu.allowFromHint', '可选，使用逗号分隔用户 ID。', 'Optional comma-separated user IDs.')}
                    >
                      <Input
                        value={feishuDraft.allowFrom}
                        onChange={(event) => setFeishuDraft((prev) => ({ ...prev, allowFrom: event.target.value }))}
                        placeholder={tx('channels.feishu.allowFromPlaceholder', 'ou_xxx, ou_yyy', 'ou_xxx, ou_yyy')}
                        className="h-11 rounded-2xl"
                      />
                    </ChannelField>
                    <ChannelEnabledToggle
                      checked={feishuDraft.enabled}
                      onCheckedChange={(checked) => setFeishuDraft((prev) => ({ ...prev, enabled: checked }))}
                      label={t('channels.form.enabled')}
                    />
                  </div>
                ) : null}
            </div>
              </div>

            <div className="app-dialog-section flex shrink-0 items-center justify-between gap-3 border-t px-6 py-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <LockKeyhole className="h-4 w-4" />
                {t(
                  'channels.saveHint',
                  isZh ? '当前修改会写入 OpenClaw 配置快照。' : 'Changes are written into the current OpenClaw config snapshot.',
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" className="app-soft-button rounded-2xl" onClick={() => setDialogOpen(false)}>
                  {t('channels.cancel')}
                </Button>
                <Button
                  type="button"
                  className="app-solid-primary rounded-2xl"
                  onClick={() => void handleSaveChannel()}
                  disabled={configLoading || configSaving}
                >
                  {configSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {t('channels.save')}
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

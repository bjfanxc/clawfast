'use client'

import React from 'react'
import JSON5 from 'json5'
import {
  Bot,
  BriefcaseBusiness,
  CloudLightning,
  Gamepad2,
  Loader2,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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

type ChannelType = 'telegram' | 'feishu'

type TelegramDraft = {
  enabled: boolean
  botToken: string
  dmPolicy: string
  groupPolicy: string
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
  const Icon = getChannelIcon(channelId)

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
  }
}

function buildFeishuDraft(config: Record<string, unknown> | null): FeishuDraft {
  const channel = getChannelConfig(config, 'feishu')
  const accounts = channel?.accounts && typeof channel.accounts === 'object' && !Array.isArray(channel.accounts)
    ? (channel.accounts as Record<string, unknown>)
    : {}
  const accountId = Object.keys(accounts)[0] ?? 'main'
  const account = accounts[accountId] && typeof accounts[accountId] === 'object' && !Array.isArray(accounts[accountId])
    ? (accounts[accountId] as Record<string, unknown>)
    : null

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
  }
}

function mergeTelegramConfig(base: Record<string, unknown>, draft: TelegramDraft) {
  const existing = getChannelConfig(base, 'telegram') ?? {}
  const next = { ...existing }
  next.enabled = draft.enabled
  next.botToken = draft.botToken.trim()
  next.dmPolicy = draft.dmPolicy
  next.groupPolicy = draft.groupPolicy
  setPathValue(base, ['channels', 'telegram'], next)
  setPathValue(base, ['plugins', 'entries', 'telegram', 'enabled'], true)
}

function mergeFeishuConfig(base: Record<string, unknown>, draft: FeishuDraft) {
  const existing = getChannelConfig(base, 'feishu') ?? {}
  const next = { ...existing } as Record<string, unknown>
  const accountId = draft.accountId.trim() || 'main'
  const existingAccounts =
    next.accounts && typeof next.accounts === 'object' && !Array.isArray(next.accounts)
      ? { ...(next.accounts as Record<string, unknown>) }
      : {}
  const existingAccount =
    existingAccounts[accountId] && typeof existingAccounts[accountId] === 'object' && !Array.isArray(existingAccounts[accountId])
      ? { ...(existingAccounts[accountId] as Record<string, unknown>) }
      : {}

  next.enabled = draft.enabled
  next.domain = draft.domain.trim() || 'feishu'
  next.dmPolicy = draft.dmPolicy
  next.groupPolicy = draft.groupPolicy

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

export default function ChannelsView() {
  const { t } = useTranslation()
  const [data, setData] = React.useState<ChannelsSnapshot | null>(null)
  const [configSnapshot, setConfigSnapshot] = React.useState<ConfigSnapshot | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [configLoading, setConfigLoading] = React.useState(false)
  const [configSaving, setConfigSaving] = React.useState(false)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [channelType, setChannelType] = React.useState<ChannelType>('telegram')
  const [telegramDraft, setTelegramDraft] = React.useState<TelegramDraft>({
    enabled: true,
    botToken: '',
    dmPolicy: 'pairing',
    groupPolicy: 'open',
  })
  const [feishuDraft, setFeishuDraft] = React.useState<FeishuDraft>({
    enabled: true,
    accountId: 'main',
    appId: '',
    appSecret: '',
    name: '',
    domain: 'feishu',
    dmPolicy: 'pairing',
    groupPolicy: 'open',
    verificationToken: '',
  })
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

  const refreshConfig = React.useCallback(async () => {
    setConfigLoading(true)
    try {
      const snapshot = await loadConfigSnapshot()
      setConfigSnapshot(snapshot)
      const rawText = typeof snapshot.raw === 'string' ? snapshot.raw : stringifyConfig(snapshot.config ?? {})
      const parsed = parseJson(rawText)
      if (!parsed.ok) {
        throw new Error(parsed.error)
      }
      setTelegramDraft(buildTelegramDraft(parsed.value))
      setFeishuDraft(buildFeishuDraft(parsed.value))
      return { snapshot, config: parsed.value }
    } finally {
      setConfigLoading(false)
    }
  }, [])

  const openAddSheet = async () => {
    setSheetOpen(true)
    try {
      await refreshConfig()
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
      if (channelType === 'telegram') {
        mergeTelegramConfig(base, telegramDraft)
      } else {
        mergeFeishuConfig(base, feishuDraft)
      }

      const nextRaw = stringifyConfig(base)
      const updated = await saveConfigSnapshot({
        raw: nextRaw,
        baseHash: configSnapshot.hash,
      })
      setConfigSnapshot(updated)
      setSheetOpen(false)
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
  const meta = snapshot?.channelMeta?.length
    ? snapshot.channelMeta
    : (snapshot?.channelOrder ?? []).map((id) => ({
        id,
        label: snapshot?.channelLabels?.[id] ?? id,
        detailLabel: snapshot?.channelDetailLabels?.[id] ?? snapshot?.channelLabels?.[id] ?? id,
      }))

  const channels = snapshot?.channels ?? {}
  const channelAccounts = snapshot?.channelAccounts ?? {}
  const defaultAccountIds = snapshot?.channelDefaultAccountId ?? {}
  const channelCards = meta.map((entry) => deriveChannelCard(entry, channels, channelAccounts, defaultAccountIds))

  const totalChannels = channelCards.length
  const configuredChannels = channelCards.filter((entry) => entry.configured).length
  const runningChannels = channelCards.filter((entry) => entry.running).length

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
            <Button className="gap-2 bg-blue-600 text-white hover:bg-blue-700" onClick={() => void openAddSheet()}>
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

            {!loading && channelCards.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
                <CloudLightning className="mx-auto h-10 w-10 text-muted-foreground/60" />
                <h3 className="mt-4 text-lg font-semibold">{t('channels.emptyTitle')}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t('channels.emptyDescription')}</p>
              </div>
            ) : null}

            {!loading && channelCards.length > 0 ? (
              <div className="space-y-3">
                {channelCards.map((channel) => (
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

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto border-l border-border/80 sm:max-w-[520px]">
          <SheetHeader className="space-y-3">
            <SheetTitle>{t('channels.addTitle')}</SheetTitle>
            <SheetDescription>{t('channels.addSubtitle')}</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={channelType === 'telegram' ? 'default' : 'outline'}
                className={cn('rounded-2xl', channelType === 'telegram' && 'bg-blue-600 text-white hover:bg-blue-700')}
                onClick={() => setChannelType('telegram')}
              >
                Telegram
              </Button>
              <Button
                type="button"
                variant={channelType === 'feishu' ? 'default' : 'outline'}
                className={cn('rounded-2xl', channelType === 'feishu' && 'bg-blue-600 text-white hover:bg-blue-700')}
                onClick={() => setChannelType('feishu')}
              >
                {t('channels.feishu.name')}
              </Button>
            </div>

            {configLoading ? (
              <div className="flex items-center justify-center rounded-3xl border border-dashed border-border bg-muted/20 px-6 py-12 text-sm text-muted-foreground">
                <Loader2 className="mr-3 h-4 w-4 animate-spin" />
                {t('channels.configLoading')}
              </div>
            ) : null}

            {!configLoading && channelType === 'telegram' ? (
              <div className="space-y-4">
                <ChannelField label={t('channels.telegram.botTokenLabel')} hint={t('channels.telegram.botTokenHint')}>
                  <Input
                    type="password"
                    value={telegramDraft.botToken}
                    onChange={(event) => setTelegramDraft((prev) => ({ ...prev, botToken: event.target.value }))}
                    placeholder={t('channels.telegram.botTokenPlaceholder')}
                    className="h-11 rounded-2xl"
                  />
                </ChannelField>
                <ChannelField label={t('channels.form.dmPolicy')}>
                  <select
                    value={telegramDraft.dmPolicy}
                    onChange={(event) => setTelegramDraft((prev) => ({ ...prev, dmPolicy: event.target.value }))}
                    className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none"
                  >
                    {DM_POLICY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </ChannelField>
                <ChannelField label={t('channels.form.groupPolicy')}>
                  <select
                    value={telegramDraft.groupPolicy}
                    onChange={(event) => setTelegramDraft((prev) => ({ ...prev, groupPolicy: event.target.value }))}
                    className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none"
                  >
                    {GROUP_POLICY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </ChannelField>
                <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={telegramDraft.enabled}
                    onChange={(event) => setTelegramDraft((prev) => ({ ...prev, enabled: event.target.checked }))}
                    className="h-4 w-4 rounded border-input"
                  />
                  {t('channels.form.enabled')}
                </label>
              </div>
            ) : null}

            {!configLoading && channelType === 'feishu' ? (
              <div className="space-y-4">
                <ChannelField label={t('channels.feishu.accountIdLabel')} hint={t('channels.feishu.accountIdHint')}>
                  <Input
                    value={feishuDraft.accountId}
                    onChange={(event) => setFeishuDraft((prev) => ({ ...prev, accountId: event.target.value }))}
                    placeholder={t('channels.feishu.accountIdPlaceholder')}
                    className="h-11 rounded-2xl"
                  />
                </ChannelField>
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
                <ChannelField label={t('channels.feishu.nameLabel')}>
                  <Input
                    value={feishuDraft.name}
                    onChange={(event) => setFeishuDraft((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder={t('channels.feishu.namePlaceholder')}
                    className="h-11 rounded-2xl"
                  />
                </ChannelField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ChannelField label={t('channels.feishu.domainLabel')}>
                    <select
                      value={feishuDraft.domain}
                      onChange={(event) => setFeishuDraft((prev) => ({ ...prev, domain: event.target.value }))}
                      className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none"
                    >
                      <option value="feishu">feishu</option>
                      <option value="lark">lark</option>
                    </select>
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <ChannelField label={t('channels.form.dmPolicy')}>
                    <select
                      value={feishuDraft.dmPolicy}
                      onChange={(event) => setFeishuDraft((prev) => ({ ...prev, dmPolicy: event.target.value }))}
                      className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none"
                    >
                      {DM_POLICY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </ChannelField>
                  <ChannelField label={t('channels.form.groupPolicy')}>
                    <select
                      value={feishuDraft.groupPolicy}
                      onChange={(event) => setFeishuDraft((prev) => ({ ...prev, groupPolicy: event.target.value }))}
                      className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none"
                    >
                      {GROUP_POLICY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </ChannelField>
                </div>
                <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={feishuDraft.enabled}
                    onChange={(event) => setFeishuDraft((prev) => ({ ...prev, enabled: event.target.checked }))}
                    className="h-4 w-4 rounded border-input"
                  />
                  {t('channels.form.enabled')}
                </label>
              </div>
            ) : null}
          </div>

          <SheetFooter className="mt-8 gap-3">
            <Button type="button" variant="outline" className="rounded-2xl" onClick={() => setSheetOpen(false)}>
              {t('channels.cancel')}
            </Button>
            <Button type="button" className="rounded-2xl" onClick={() => void handleSaveChannel()} disabled={configLoading || configSaving}>
              {configSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('channels.save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

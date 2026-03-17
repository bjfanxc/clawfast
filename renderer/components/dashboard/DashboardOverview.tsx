'use client'

import React from 'react'
import { AlertTriangle, Cable, Clock3, Database, Layers3, RadioTower, RefreshCw, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { loadDashboardOverview } from '@/domain/dashboard/dashboard-service'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/store/toast-store'
import type { DashboardHealthPayload, DashboardOverviewPayload, DashboardPresenceEntry } from '../../../shared/dashboard'

function formatRelativeTime(timestamp: number | null | undefined, t: ReturnType<typeof useTranslation>['t']) {
  if (!timestamp) {
    return t('dashboard.notAvailable')
  }

  const diff = Math.max(0, Date.now() - timestamp)
  const seconds = Math.floor(diff / 1000)
  if (seconds < 10) {
    return t('dashboard.relative.justNow')
  }
  if (seconds < 60) {
    return t('dashboard.relative.seconds', { count: seconds })
  }

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return t('dashboard.relative.minutes', { count: minutes })
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return t('dashboard.relative.hours', { count: hours })
  }

  const days = Math.floor(hours / 24)
  return t('dashboard.relative.days', { count: days })
}

function formatTimestamp(timestamp: number | null | undefined, t: ReturnType<typeof useTranslation>['t']) {
  if (!timestamp) {
    return t('dashboard.notAvailable')
  }

  return new Date(timestamp).toLocaleString()
}

function formatDurationMs(durationMs: number | null | undefined, t: ReturnType<typeof useTranslation>['t']) {
  if (durationMs == null) {
    return t('dashboard.notAvailable')
  }

  if (durationMs < 1000) {
    return `${durationMs}ms`
  }

  const seconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainSeconds = seconds % 60

  if (minutes <= 0) {
    return `${seconds}s`
  }

  return `${minutes}m ${remainSeconds}s`
}

function formatNextWake(nextWakeAtMs: number | null | undefined, t: ReturnType<typeof useTranslation>['t']) {
  if (!nextWakeAtMs) {
    return t('dashboard.notAvailable')
  }

  return `${formatTimestamp(nextWakeAtMs, t)} (${formatRelativeTime(nextWakeAtMs, t)})`
}

function formatMaskValue(value: string | null | undefined, t: ReturnType<typeof useTranslation>['t']) {
  return value?.trim() ? value : t('dashboard.notConfigured')
}

function getHeartbeatTimestamp(
  health: DashboardHealthPayload | null,
  lastHeartbeat: DashboardOverviewPayload['lastHeartbeat']
) {
  return lastHeartbeat?.ts ?? health?.ts ?? null
}

function getHeartbeatStatus(
  health: DashboardHealthPayload | null,
  lastHeartbeat: DashboardOverviewPayload['lastHeartbeat'],
  t: ReturnType<typeof useTranslation>['t']
) {
  if (lastHeartbeat?.status?.trim()) {
    return lastHeartbeat.status
  }

  if (health?.ok === true) {
    return t('dashboard.snapshot.statusOk')
  }

  if (health?.ok === false) {
    return t('dashboard.snapshot.statusOffline')
  }

  return t('dashboard.notAvailable')
}

function getHeartbeatReason(
  health: DashboardHealthPayload | null,
  lastHeartbeat: DashboardOverviewPayload['lastHeartbeat'],
  t: ReturnType<typeof useTranslation>['t']
) {
  if (lastHeartbeat?.reason?.trim()) {
    return lastHeartbeat.reason
  }

  if (health?.ok === true) {
    return t('dashboard.details.heartbeatHealthy')
  }

  if (health?.ok === false) {
    return t('dashboard.details.heartbeatUnavailable')
  }

  return t('dashboard.notAvailable')
}

function getHeartbeatDuration(
  health: DashboardHealthPayload | null,
  lastHeartbeat: DashboardOverviewPayload['lastHeartbeat']
) {
  return lastHeartbeat?.durationMs ?? health?.durationMs ?? null
}

function getGatewayPresence(presence: DashboardPresenceEntry[]) {
  return (
    presence.find((entry) => entry.reason === 'self' || entry.mode === 'gateway') ??
    presence[0] ??
    null
  )
}

function getDefaultHeartbeat(health: DashboardHealthPayload | null, status: DashboardOverviewPayload['status']) {
  const healthDefault =
    health?.agents?.find((entry) => entry.isDefault) ??
    health?.agents?.find((entry) => entry.agentId === health.defaultAgentId) ??
    health?.agents?.[0]

  if (healthDefault?.heartbeat) {
    return {
      defaultAgentId: healthDefault.agentId ?? health.defaultAgentId ?? null,
      every: healthDefault.heartbeat.every ?? null,
      enabled: healthDefault.heartbeat.enabled ?? null,
    }
  }

  const statusDefault =
    status?.heartbeat?.agents?.find((entry) => entry.agentId === status.heartbeat?.defaultAgentId) ??
    status?.heartbeat?.agents?.[0]

  return {
    defaultAgentId: status?.heartbeat?.defaultAgentId ?? statusDefault?.agentId ?? null,
    every: statusDefault?.every ?? null,
    enabled: statusDefault?.enabled ?? null,
  }
}

function getChannelCounts(snapshot: DashboardOverviewPayload['channels']['snapshot']) {
  const channelEntries = Object.values(snapshot?.channels ?? {}) as Array<Record<string, unknown>>

  return {
    total: snapshot?.channelOrder?.length ?? 0,
    configured: channelEntries.filter((entry) => entry.configured === true).length,
    running: channelEntries.filter((entry) => entry.running === true).length,
  }
}

function getChannelNames(snapshot: DashboardOverviewPayload['channels']['snapshot'], t: ReturnType<typeof useTranslation>['t']) {
  const order = snapshot?.channelOrder ?? []
  if (order.length === 0) {
    return t('dashboard.notes.channelsFallback')
  }

  return order.map((channelId) => snapshot?.channelLabels?.[channelId] ?? channelId).join(', ')
}

function DashboardField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 space-y-2">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="rounded-2xl border border-border/80 bg-background/80 px-4 py-3 text-sm text-foreground shadow-sm break-all">
        {value}
      </div>
    </div>
  )
}

function SnapshotStat({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'success' | 'warn'
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-background/80 px-4 py-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div
        className={cn(
          'mt-3 text-2xl font-semibold',
          tone === 'success' && 'text-emerald-600 dark:text-emerald-300',
          tone === 'warn' && 'text-primary dark:text-primary'
        )}
      >
        {value}
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint: string
}) {
  return (
    <Card className="min-w-0 rounded-[28px] border-border/80 bg-card/95 shadow-sm">
      <CardContent className="p-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="shrink-0 rounded-2xl border border-primary/16 bg-primary/10 p-3 text-primary dark:border-primary/24 dark:bg-primary/18 dark:text-primary-foreground">
            {icon}
          </div>
          <div className="min-w-0 text-sm font-semibold text-muted-foreground">{label}</div>
        </div>
        <div className="mt-5 break-words text-4xl font-bold tracking-tight leading-none">{value}</div>
        <div className="mt-4 break-words text-sm leading-7 text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4 border-b border-border/60 py-3 last:border-b-0 last:pb-0">
      <div className="shrink-0 text-sm font-medium text-muted-foreground">{label}</div>
      <div className="min-w-0 text-right text-sm text-foreground break-all">{value}</div>
    </div>
  )
}

export default function DashboardOverview({ refreshSignal = 0 }: { refreshSignal?: number }) {
  const { t } = useTranslation()
  const [overview, setOverview] = React.useState<DashboardOverviewPayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const pushToast = useToastStore((state) => state.pushToast)

  const loadOverview = React.useCallback(async () => {
    setRefreshing(true)

    try {
      const payload = await loadDashboardOverview()
      setOverview(payload)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      pushToast('error', message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [pushToast])

  React.useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  React.useEffect(() => {
    if (refreshSignal <= 0) {
      return
    }

    void loadOverview()
  }, [loadOverview, refreshSignal])

  const access = overview?.access ?? null
  const snapshot = overview?.channels.snapshot ?? null
  const presence = overview?.presence ?? []
  const sessionsList = overview?.sessionsList ?? null
  const cron = overview?.cron ?? null
  const status = overview?.status ?? null
  const health = overview?.health ?? null
  const models = overview?.models?.models ?? []
  const lastHeartbeat = overview?.lastHeartbeat ?? null

  const gatewayPresence = getGatewayPresence(presence)
  const showAdminOnlyGatewayHint = !access?.bundledOpenClaw && !gatewayPresence
  const heartbeatInfo = getDefaultHeartbeat(health, status)
  const channelCounts = getChannelCounts(snapshot)
  const sessionsCount = sessionsList?.count ?? status?.sessions?.count ?? health?.sessions?.count ?? null
  const recentSessionsCount = sessionsList?.sessions?.length ?? health?.sessions?.recent?.length ?? 0
  const modelDefaults = sessionsList?.defaults ?? null
  const latestSession = sessionsList?.sessions?.[0] ?? null
  const statusLabel = health?.ok ? t('dashboard.snapshot.statusOk') : t('dashboard.snapshot.statusOffline')
  const statusTone = health?.ok ? 'success' : 'warn'
  const heartbeatTimestamp = getHeartbeatTimestamp(health, lastHeartbeat)
  const heartbeatStatus = getHeartbeatStatus(health, lastHeartbeat, t)
  const heartbeatReason = getHeartbeatReason(health, lastHeartbeat, t)
  const heartbeatDuration = getHeartbeatDuration(health, lastHeartbeat)

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card className="min-w-0 rounded-[30px] border-border/80 shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-bold">{t('dashboard.access.title')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('dashboard.access.subtitle')}</p>
          </CardHeader>
          <CardContent className="space-y-5">
            {showAdminOnlyGatewayHint ? (
              <div className="flex items-start gap-3 rounded-2xl border border-primary/16 bg-primary/10 px-4 py-3 text-sm text-foreground dark:border-primary/24 dark:bg-primary/18 dark:text-primary-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>{t('dashboard.access.adminOnlyGatewayHint')}</div>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <DashboardField label={t('dashboard.access.wsUrl')} value={access?.wsUrl ?? t('dashboard.notAvailable')} />
              <DashboardField label={t('dashboard.access.token')} value={formatMaskValue(access?.tokenPreview, t)} />
              <DashboardField label={t('dashboard.access.locale')} value={access?.locale ?? t('dashboard.notAvailable')} />
              <DashboardField label={t('dashboard.access.gatewayVersion')} value={gatewayPresence?.version ?? t('dashboard.notAvailable')} />
              <DashboardField label={t('dashboard.access.gatewayHost')} value={gatewayPresence?.host ?? t('dashboard.notAvailable')} />
              <DashboardField label={t('dashboard.access.gatewayPlatform')} value={gatewayPresence?.platform ?? t('dashboard.notAvailable')} />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t('dashboard.access.configPath')}
              </div>
              <div className="rounded-2xl border border-border/80 bg-background/80 px-4 py-3 font-mono text-xs text-muted-foreground shadow-sm">
                {access?.configPath ?? t('dashboard.notAvailable')}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" className="gap-2" onClick={() => void loadOverview()} disabled={refreshing}>
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                {t('dashboard.actions.refresh')}
              </Button>
              <div className="text-sm text-muted-foreground">{t('dashboard.access.connectHint')}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 rounded-[30px] border-border/80 shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-bold">{t('dashboard.snapshot.title')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('dashboard.snapshot.subtitle')}</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <SnapshotStat label={t('dashboard.snapshot.status')} value={statusLabel} tone={statusTone} />
              <SnapshotStat label={t('dashboard.snapshot.tickInterval')} value={heartbeatInfo.every ?? t('dashboard.notAvailable')} />
              <SnapshotStat
                label={t('dashboard.snapshot.lastChannelsRefresh')}
                value={formatRelativeTime(snapshot?.ts ?? null, t)}
              />
              <SnapshotStat
                label={t('dashboard.snapshot.lastHeartbeat')}
                value={formatRelativeTime(heartbeatTimestamp, t)}
              />
            </div>

            <div className="rounded-2xl border border-border/80 bg-muted/25 px-4 py-3 text-sm text-muted-foreground">
              {t('dashboard.snapshot.channelsHint', { channels: getChannelNames(snapshot, t) })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-4">
        <StatCard
          icon={<RadioTower className="h-5 w-5" />}
          label={t('dashboard.stats.instances')}
          value={String(presence.length)}
          hint={t('dashboard.stats.instancesHint')}
        />
        <StatCard
          icon={<Layers3 className="h-5 w-5" />}
          label={t('dashboard.stats.sessions')}
          value={sessionsCount == null ? t('dashboard.notAvailable') : String(sessionsCount)}
          hint={t('dashboard.stats.sessionsHint')}
        />
        <StatCard
          icon={<Clock3 className="h-5 w-5" />}
          label={t('dashboard.stats.cron')}
          value={cron?.enabled == null ? t('dashboard.notAvailable') : cron.enabled ? t('dashboard.enabled') : t('dashboard.disabled')}
          hint={t('dashboard.stats.cronNext', { time: formatNextWake(cron?.nextWakeAtMs, t) })}
        />
        <StatCard
          icon={<Database className="h-5 w-5" />}
          label={t('dashboard.stats.models')}
          value={String(models.length)}
          hint={t('dashboard.stats.modelsHint')}
        />
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-3">
        <Card className="min-w-0 rounded-[28px] border-border/80 shadow-sm">
          <CardHeader className="space-y-2 pb-3">
            <CardTitle className="text-xl font-bold">{t('dashboard.details.gatewayTitle')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('dashboard.details.gatewaySubtitle')}</p>
          </CardHeader>
          <CardContent>
            <DetailRow label={t('dashboard.details.host')} value={gatewayPresence?.host ?? t('dashboard.notAvailable')} />
            <DetailRow label={t('dashboard.details.ip')} value={gatewayPresence?.ip ?? t('dashboard.notAvailable')} />
            <DetailRow label={t('dashboard.details.version')} value={gatewayPresence?.version ?? t('dashboard.notAvailable')} />
            <DetailRow label={t('dashboard.details.platform')} value={gatewayPresence?.platform ?? t('dashboard.notAvailable')} />
            <DetailRow label={t('dashboard.details.mode')} value={gatewayPresence?.mode ?? t('dashboard.notAvailable')} />
          </CardContent>
        </Card>

        <Card className="min-w-0 rounded-[28px] border-border/80 shadow-sm">
          <CardHeader className="space-y-2 pb-3">
            <CardTitle className="text-xl font-bold">{t('dashboard.details.sessionsTitle')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('dashboard.details.sessionsSubtitle')}</p>
          </CardHeader>
          <CardContent>
            <DetailRow label={t('dashboard.details.defaultAgent')} value={heartbeatInfo.defaultAgentId ?? t('dashboard.notAvailable')} />
            <DetailRow label={t('dashboard.details.defaultModel')} value={modelDefaults?.model ?? latestSession?.model ?? t('dashboard.notAvailable')} />
            <DetailRow label={t('dashboard.details.modelProvider')} value={modelDefaults?.modelProvider ?? latestSession?.modelProvider ?? t('dashboard.notAvailable')} />
            <DetailRow label={t('dashboard.details.contextWindow')} value={modelDefaults?.contextTokens != null ? String(modelDefaults.contextTokens) : t('dashboard.notAvailable')} />
            <DetailRow label={t('dashboard.details.recentSessions')} value={String(recentSessionsCount)} />
          </CardContent>
        </Card>

        <Card className="min-w-0 rounded-[28px] border-border/80 shadow-sm">
          <CardHeader className="space-y-2 pb-3">
            <CardTitle className="text-xl font-bold">{t('dashboard.details.runtimeTitle')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('dashboard.details.runtimeSubtitle')}</p>
          </CardHeader>
          <CardContent>
            <DetailRow label={t('dashboard.details.channelsTotal')} value={String(channelCounts.total)} />
            <DetailRow label={t('dashboard.details.channelsConfigured')} value={String(channelCounts.configured)} />
            <DetailRow label={t('dashboard.details.channelsRunning')} value={String(channelCounts.running)} />
            <DetailRow label={t('dashboard.details.heartbeatStatus')} value={heartbeatStatus} />
            <DetailRow label={t('dashboard.details.heartbeatReason')} value={heartbeatReason} />
            <DetailRow label={t('dashboard.details.heartbeatDuration')} value={formatDurationMs(heartbeatDuration, t)} />
          </CardContent>
        </Card>
      </div>

      {loading && !overview ? (
        <div className="rounded-3xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
          <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-muted-foreground/60" />
          {t('dashboard.loading')}
        </div>
      ) : null}

      {!loading && !overview ? (
        <div className="rounded-3xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
          {t('dashboard.empty')}
        </div>
      ) : null}
    </div>
  )
}

'use client'

import React from 'react'
import { Activity, BarChart3, CalendarRange, Loader2, RefreshCcw, ScrollText, Wrench } from 'lucide-react'
import type { TFunction } from 'i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  buildActivityStats,
  formatCompact,
  formatDuration,
  formatPercent,
  formatRelativeTime,
  formatTokens,
  getSessionTitle,
  type UsageInsightItem,
} from '@/lib/usage/selectors'
import type { CostUsageDailyEntry, SessionLogEntry, UsageSessionEntry } from '../../../shared/usage'
import type { useUsageOverview } from '@/hooks/usage/useUsageOverview'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getLogRoleLabel(role: SessionLogEntry['role'], t: TFunction) {
  return role === 'assistant' || role === 'tool' || role === 'toolResult' ? t('sessions.roleAssistant') : t('sessions.roleUser')
}

function SummaryCard({ icon: Icon, title, value, hint }: { icon: React.ComponentType<{ className?: string }>; title: string; value: string; hint: string }) {
  return (
    <Card className="app-subpanel rounded-[28px] shadow-none">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/16 bg-primary/10 text-primary dark:border-primary/35 dark:bg-primary/20 dark:text-primary"><Icon className="h-5 w-5" /></div>
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

function InsightList({ title, items, empty }: { title: string; items: UsageInsightItem[]; empty: string }) {
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

function DailyChart({ daily, chartMode }: { daily: CostUsageDailyEntry[]; chartMode: 'total' | 'byType' }) {
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

function BreakdownBar({ totals }: { totals: ReturnType<typeof import('@/lib/usage/selectors').buildUsageTotals> }) {
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

function ActivityPanel({ sessions, t }: { sessions: UsageSessionEntry[]; t: TFunction }) {
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

type UsageViewModel = ReturnType<typeof useUsageOverview>

type UsageViewContentProps = {
  t: TFunction
  vm: UsageViewModel
}

export default function UsageViewContent({ t, vm }: UsageViewContentProps) {
  const insightEmpty = t('usage.insights.empty')

  return (
    <div className="h-full flex-1 overflow-auto bg-background p-6 lg:p-8">
      <div className="mx-auto flex max-w-[1700px] flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:gap-5"><h1 className="text-3xl font-bold tracking-tight">{t('usage.title')}</h1><p className="text-sm text-muted-foreground lg:pb-1">{t('usage.subtitle')}</p></div>
          <div className="flex flex-wrap items-center gap-3">
            <Input type="date" value={vm.startDate} onChange={(event) => vm.setStartDate(event.target.value)} className="h-11 w-[170px] rounded-2xl" />
            <Input type="date" value={vm.endDate} onChange={(event) => vm.setEndDate(event.target.value)} className="h-11 w-[170px] rounded-2xl" />
            <Button variant="outline" className="rounded-2xl px-4" onClick={() => void vm.refreshOverview(vm.selectedSessionKey)} disabled={vm.loading}>{vm.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}{t('usage.refresh')}</Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <SummaryCard icon={ScrollText} title={t('usage.cards.messages')} value={formatTokens(vm.stats.messages)} hint={`${vm.sessions.length} ${t('usage.cards.sessionsUnit')}`} />
          <SummaryCard icon={Wrench} title={t('usage.cards.toolCalls')} value={formatTokens(vm.stats.toolCalls)} hint={`${vm.overview?.usage?.aggregates?.tools?.uniqueTools ?? 0} ${t('usage.cards.toolsUnit')}`} />
          <SummaryCard icon={Activity} title={t('usage.cards.errors')} value={formatTokens(vm.stats.errors)} hint={formatPercent(vm.stats.errorRate)} />
          <SummaryCard icon={BarChart3} title={t('usage.cards.avgTokens')} value={formatCompact(vm.stats.avgTokens)} hint={`${formatTokens(vm.totals.totalTokens)} ${t('usage.tokensLabel')}`} />
          <SummaryCard icon={CalendarRange} title={t('usage.cards.sessions')} value={formatTokens(vm.sessions.length)} hint={`${formatCompact(vm.stats.throughput)} tok/min - ${formatPercent(vm.stats.cacheHitRate)}`} />
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          <InsightList title={t('usage.insights.topModels')} items={vm.topModels} empty={insightEmpty} />
          <InsightList title={t('usage.insights.topProviders')} items={vm.topProviders} empty={insightEmpty} />
          <InsightList title={t('usage.insights.topTools')} items={vm.topTools} empty={insightEmpty} />
          <InsightList title={t('usage.insights.topAgents')} items={vm.topAgents} empty={insightEmpty} />
          <InsightList title={t('usage.insights.topChannels')} items={vm.topChannels} empty={insightEmpty} />
          <InsightList title={t('usage.insights.peakErrorDays')} items={vm.peakErrorDays} empty={insightEmpty} />
          <InsightList title={t('usage.insights.peakErrorHours')} items={vm.peakErrorHours} empty={insightEmpty} />
        </div>

        <ActivityPanel sessions={vm.sessions} t={t} />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_420px]">
          <Card className="app-subpanel rounded-[30px] shadow-none">
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-2xl font-black">{t('usage.overviewTitle')}</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-2xl border border-border/80 bg-muted/40 p-1">
                    <button type="button" className={cn('rounded-xl px-3 py-1.5 text-xs font-medium', vm.dailyChartMode === 'total' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')} onClick={() => vm.setDailyChartMode('total')}>{t('usage.chartModes.total')}</button>
                    <button type="button" className={cn('rounded-xl px-3 py-1.5 text-xs font-medium', vm.dailyChartMode === 'byType' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')} onClick={() => vm.setDailyChartMode('byType')}>{t('usage.chartModes.byType')}</button>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{t('usage.overviewHint')}</p>
            </CardHeader>
            <CardContent className="space-y-5">
              {vm.daily.length ? <DailyChart daily={vm.daily} chartMode={vm.dailyChartMode} /> : <div className="text-sm text-muted-foreground">{t('usage.empty')}</div>}
              <BreakdownBar totals={vm.totals} />
            </CardContent>
          </Card>

          <Card className="app-subpanel min-h-0 rounded-[30px] shadow-none">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-3"><CardTitle className="text-2xl font-black">{t('usage.sessionsTitle')}</CardTitle><div className="text-sm text-muted-foreground">{vm.sessions.length} {t('usage.cards.sessionsUnit')}</div></div>
              <p className="text-sm text-muted-foreground">{t('usage.sessionsHint')}</p>
            </CardHeader>
            <CardContent className="min-h-[520px]">
              {vm.loading ? (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('usage.loading')}</div>
              ) : vm.sessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{t('usage.empty')}</div>
              ) : (
                <ScrollArea className="h-[520px] pr-3">
                  <div className="mb-4 flex flex-wrap gap-4 rounded-[24px] border border-border/80 bg-muted/35 p-4 text-sm text-foreground">
                    <div>{formatCompact(vm.stats.avgTokens)} avg</div>
                    <div>{vm.stats.errors} errors</div>
                    <div>{formatCompact(vm.stats.throughput)} tok/min</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {vm.sessions.map((session) => (
                      <button key={session.key} type="button" className={cn('rounded-2xl border px-4 py-4 text-left transition', vm.selectedSessionKey === session.key ? 'border-primary/18 bg-primary/10 text-foreground dark:border-primary/24 dark:bg-primary/18 dark:text-primary-foreground' : 'border-border/80 bg-card/80 text-foreground hover:border-primary/14 hover:bg-primary/[0.04] dark:bg-card/65 dark:hover:border-primary/20 dark:hover:bg-primary/[0.08]')} onClick={() => vm.setSelectedSessionKey(session.key)}>
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
            <p className="text-sm text-muted-foreground">{vm.selectedSession ? getSessionTitle(vm.selectedSession) : t('usage.detailHint')}</p>
          </CardHeader>
          <CardContent className="space-y-5">
            {!vm.selectedSession ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{t('usage.detailEmpty')}</div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
                  <div className="flex flex-wrap gap-2">{[vm.selectedSession.channel, vm.selectedSession.agentId, vm.selectedSession.modelProvider || vm.selectedSession.providerOverride, vm.selectedSession.model].filter(Boolean).map((item) => <span key={item} className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">{item}</span>)}</div>
                  <div className="flex items-center gap-4 text-sm"><div><span className="font-bold text-foreground">{formatCompact(vm.selectedSession.usage?.totalTokens ?? 0)}</span> {t('usage.tokensLabel')}</div></div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard icon={ScrollText} title={t('usage.cards.messages')} value={String(vm.selectedSession.usage?.messageCounts?.total ?? 0)} hint={`${vm.selectedSession.usage?.messageCounts?.user ?? 0} user - ${vm.selectedSession.usage?.messageCounts?.assistant ?? 0} assistant`} />
                  <SummaryCard icon={Wrench} title={t('usage.cards.toolCalls')} value={String(vm.selectedSession.usage?.toolUsage?.totalCalls ?? 0)} hint={`${vm.selectedSession.usage?.toolUsage?.uniqueTools ?? 0} ${t('usage.cards.toolsUnit')}`} />
                  <SummaryCard icon={Activity} title={t('usage.cards.errors')} value={String(vm.selectedSession.usage?.messageCounts?.errors ?? 0)} hint={`${vm.selectedSession.usage?.messageCounts?.toolResults ?? 0} tool results`} />
                  <SummaryCard icon={CalendarRange} title={t('usage.sessionRow.duration')} value={formatDuration(vm.selectedSession.usage?.durationMs ?? 0)} hint={`${vm.selectedSession.usage?.firstActivity ? new Date(vm.selectedSession.usage.firstActivity).toLocaleString() : '-'} - ${vm.selectedSession.usage?.lastActivity ? new Date(vm.selectedSession.usage.lastActivity).toLocaleString() : '-'}`} />
                </div>

                <div className="grid gap-3 rounded-[24px] border border-border/80 bg-muted/35 p-4 text-sm text-foreground sm:grid-cols-2 xl:grid-cols-4">
                  <div><div className="text-xs text-muted-foreground">{t('usage.detail.channel')}</div><div className="mt-1 font-medium">{vm.selectedSession.channel || '-'}</div></div>
                  <div><div className="text-xs text-muted-foreground">{t('usage.detail.model')}</div><div className="mt-1 break-words font-medium">{vm.selectedSession.model || '-'}</div></div>
                  <div><div className="text-xs text-muted-foreground">{t('usage.detail.provider')}</div><div className="mt-1 break-words font-medium">{vm.selectedSession.modelProvider || vm.selectedSession.providerOverride || '-'}</div></div>
                  <div><div className="text-xs text-muted-foreground">{t('usage.detail.updatedAt')}</div><div className="mt-1 font-medium">{formatRelativeTime(vm.selectedSession.updatedAt)}</div></div>
                </div>

                <div className="grid gap-5">
                  <InsightList title={t('usage.detail.topTools')} items={vm.sessionTools} empty={insightEmpty} />
                  <InsightList title={t('usage.detail.modelMix')} items={vm.sessionModels} empty={insightEmpty} />
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
                  <div className="rounded-[24px] border border-border/80 bg-muted/35 p-4">
                    <div className="mb-3 text-sm font-semibold text-foreground">{t('usage.detail.logs')}</div>
                    {vm.detailLoading ? <div className="flex h-40 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('usage.loading')}</div> : vm.logs.length ? (
                      <ScrollArea className="h-[360px] pr-3">
                        <div className="space-y-3">
                          {vm.logs.map((log, index) => (
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
                      <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{t('usage.breakdown.input')}</span><span className="font-medium">{formatTokens(vm.selectedSession.usage?.input ?? 0)}</span></div>
                      <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{t('usage.breakdown.output')}</span><span className="font-medium">{formatTokens(vm.selectedSession.usage?.output ?? 0)}</span></div>
                      <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{t('usage.breakdown.cacheRead')}</span><span className="font-medium">{formatTokens(vm.selectedSession.usage?.cacheRead ?? 0)}</span></div>
                      <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{t('usage.breakdown.cacheWrite')}</span><span className="font-medium">{formatTokens(vm.selectedSession.usage?.cacheWrite ?? 0)}</span></div>
                      <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{t('usage.sessionRow.messages')}</span><span className="font-medium">{vm.selectedSession.usage?.messageCounts?.total ?? 0}</span></div>
                      <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{t('usage.sessionRow.tokens')}</span><span className="font-medium">{formatTokens(vm.selectedSession.usage?.totalTokens ?? 0)}</span></div>
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

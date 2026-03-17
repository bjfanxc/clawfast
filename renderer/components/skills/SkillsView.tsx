'use client'

import React from 'react'
import {
  FolderOpen,
  Globe,
  Loader2,
  Puzzle,
  RefreshCw,
  Search,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  getSkillsViewModel,
  type SkillCardModel,
  type SkillsScopeFilter,
  type SkillsSourceFilter,
} from '@/domain/skills/skills-model'
import {
  installSkill,
  loadSkillsSnapshot,
  openSkillsFolder,
  setSkillEnabled,
  updateSkill,
} from '@/domain/skills/skills-service'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/store/toast-store'
import { useTranslation } from 'react-i18next'
import type { SkillItem, SkillsSnapshot } from '../../../shared/skills'

function SkillToggle({
  checked,
  disabled,
  onToggle,
}: {
  checked: boolean
  disabled?: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors',
        checked ? 'border-primary bg-primary' : 'border-border bg-muted',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  )
}

function SkillIcon({ emoji }: { emoji: string | null }) {
  if (emoji) {
      return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/16 bg-primary/10 text-xl dark:border-primary/24 dark:bg-primary/18">
        {emoji}
      </div>
    )
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-muted/45 text-muted-foreground">
      <Puzzle className="h-4.5 w-4.5" />
    </div>
  )
}

function getIssueLabel(issue: string, t: ReturnType<typeof useTranslation>['t']) {
  if (issue.startsWith('missing-bin:')) {
    return t('skills.issues.missingBin', { name: issue.slice('missing-bin:'.length) })
  }

  if (issue.startsWith('missing-env:')) {
    return t('skills.issues.missingEnv', { name: issue.slice('missing-env:'.length) })
  }

  if (issue.startsWith('missing-config:')) {
    return t('skills.issues.missingConfig', { name: issue.slice('missing-config:'.length) })
  }

  if (issue.startsWith('missing-os:')) {
    return t('skills.issues.missingOs', { name: issue.slice('missing-os:'.length) })
  }

  switch (issue) {
    case 'missing-description':
      return t('skills.issues.missingDescription')
    case 'missing-homepage':
      return t('skills.issues.missingHomepage')
    case 'disabled':
      return t('skills.issues.disabled')
    case 'blocked-allowlist':
      return t('skills.issues.blockedAllowlist')
    default:
      return issue
  }
}

export default function SkillsView() {
  const { t } = useTranslation()
  const [snapshot, setSnapshot] = React.useState<SkillsSnapshot | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [query, setQuery] = React.useState('')
  const [scope, setScope] = React.useState<SkillsScopeFilter>('installed')
  const [sourceFilter, setSourceFilter] = React.useState<SkillsSourceFilter>('all')
  const [busySkillKey, setBusySkillKey] = React.useState<string | null>(null)
  const [openingFolder, setOpeningFolder] = React.useState(false)
  const [skillEdits, setSkillEdits] = React.useState<Record<string, string>>({})
  const pushToast = useToastStore((state) => state.pushToast)

  const loadSkills = React.useCallback(async () => {
    setLoading(true)

    try {
      const nextSnapshot = await loadSkillsSnapshot()
      setSnapshot(nextSnapshot)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      pushToast('error', message)
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  React.useEffect(() => {
    loadSkills()
  }, [loadSkills])

  const { filteredSkills, installedSkills, marketSkills, counts } = getSkillsViewModel(
    snapshot,
    scope,
    query,
    sourceFilter,
  )

  const handleToggleSkill = async (skill: SkillItem) => {
    const nextEnabled = !skill.enabled
    setBusySkillKey(skill.skillKey)

    try {
      const nextSnapshot = await setSkillEnabled(skill.skillKey, nextEnabled)
      setSnapshot(nextSnapshot)
      pushToast(nextEnabled ? 'success' : 'error', nextEnabled ? t('skills.messages.enabled') : t('skills.messages.disabled'))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      pushToast('error', message)
    } finally {
      setBusySkillKey(null)
    }
  }

  const handleSaveApiKey = async (skill: SkillCardModel) => {
    setBusySkillKey(skill.skillKey)

    try {
      const nextSnapshot = await updateSkill({
        skillKey: skill.skillKey,
        apiKey: skillEdits[skill.skillKey] ?? '',
      })
      setSnapshot(nextSnapshot)
      pushToast('success', t('skills.messages.apiKeySaved'))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      pushToast('error', message)
    } finally {
      setBusySkillKey(null)
    }
  }

  const handleInstallSkill = async (skill: SkillCardModel) => {
    const installOption = skill.install[0]
    if (!installOption) {
      return
    }

    setBusySkillKey(skill.skillKey)

    try {
      const nextSnapshot = await installSkill({
        skillKey: skill.skillKey,
        name: skill.name,
        installId: installOption.id,
        timeoutMs: 120_000,
      })
      setSnapshot(nextSnapshot)
      pushToast('success', t('skills.messages.installed'))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      pushToast('error', message)
    } finally {
      setBusySkillKey(null)
    }
  }

  const handleOpenFolder = async () => {
    setOpeningFolder(true)

    try {
      const result = await openSkillsFolder()
      if (!result?.ok) {
        throw new Error(result?.error || 'Failed to open skills folder')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      pushToast('error', message)
    } finally {
      setOpeningFolder(false)
    }
  }

  const showEmptyMarket = scope === 'market' && filteredSkills.length === 0

  return (
    <div className="h-full flex-1 overflow-auto bg-background p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:gap-5">
            <h1 className="text-3xl font-bold tracking-tight">{t('skills.title')}</h1>
            <p className="text-sm text-muted-foreground lg:pb-1">{t('skills.subtitle')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" className="gap-2" onClick={loadSkills} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              {t('skills.refresh')}
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleOpenFolder} disabled={openingFolder}>
              <FolderOpen className="h-4 w-4" />
              {openingFolder ? t('skills.openingFolder') : t('skills.openFolder')}
            </Button>
          </div>
        </div>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-xl bg-muted p-1">
                {([
                  { key: 'installed', label: t('skills.scopes.installed'), count: installedSkills.length, icon: Puzzle },
                  { key: 'market', label: t('skills.scopes.market'), count: marketSkills.length, icon: Globe },
                ] as const).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setScope(item.key)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                      scope === item.key
                        ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="text-sm text-muted-foreground">
                {snapshot?.managedSkillsDir || snapshot?.workspaceDir || snapshot?.skillsDir || t('skills.noFolder')}
              </div>
            </div>

            <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('skills.searchPlaceholder')}
                  className="pl-10"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {([
                  { key: 'all', label: t('skills.filters.all'), count: counts.all },
                  { key: 'built-in', label: t('skills.filters.builtIn'), count: counts['built-in'] },
                  { key: 'market', label: t('skills.filters.market'), count: counts.market },
                ] as const).map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setSourceFilter(filter.key)}
                    className={cn(
                      'rounded-xl border px-4 py-2 text-sm font-medium transition-colors',
                      sourceFilter === filter.key
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-foreground hover:bg-accent'
                    )}
                  >
                    {filter.label} ({filter.count})
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {loading ? (
              <div className="flex min-h-[240px] items-center justify-center rounded-3xl border border-dashed border-border bg-muted/20">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t('skills.loading')}
                </div>
              </div>
            ) : null}

            {!loading && showEmptyMarket ? (
              <div className="rounded-3xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
                <Globe className="mx-auto h-10 w-10 text-muted-foreground/60" />
                <h3 className="mt-4 text-lg font-semibold">{t('skills.marketEmptyTitle')}</h3>
                <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
                  {t('skills.marketEmptyDescription')}
                </p>
              </div>
            ) : null}

            {!loading && !showEmptyMarket && filteredSkills.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
                <Search className="mx-auto h-10 w-10 text-muted-foreground/60" />
                <h3 className="mt-4 text-lg font-semibold">{t('skills.emptyTitle')}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t('skills.emptyDescription')}</p>
              </div>
            ) : null}

            {!loading && filteredSkills.length > 0 ? (
              <div className="space-y-4">
                {filteredSkills.map((skill: SkillCardModel) => {
                  const isBusy = busySkillKey === skill.skillKey

                  return (
                    <Card
                      key={skill.skillKey}
                      className="rounded-[24px] border-border/80 bg-card/95 shadow-sm transition-shadow hover:border-primary/16 hover:shadow-md"
                    >
                      <CardHeader className="p-5 pb-3">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-3">
                              <SkillIcon emoji={skill.emoji} />
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <CardTitle className="truncate pt-0.5 text-base font-semibold leading-6">
                                    {skill.name}
                                  </CardTitle>
                                  {skill.homepage ? (
                                    <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs">
                                      <a href={skill.homepage} target="_blank" rel="noreferrer">
                                        {t('skills.homepage')}
                                      </a>
                                    </Button>
                                  ) : null}
                                </div>
                                <p
                                  className="mt-2 overflow-hidden text-sm leading-6 text-muted-foreground"
                                  style={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical',
                                  }}
                                >
                                  {skill.description}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              <span className="shrink-0 whitespace-nowrap rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                {skill.version || t('skills.versionUnknown')}
                              </span>
                              {skill.issues.map((issue) => (
                                <span
                                  key={issue}
                                  className="shrink-0 whitespace-nowrap rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                                >
                                  {getIssueLabel(issue, t)}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-stretch gap-2 lg:min-w-[220px] lg:items-end">
                            <div className="flex items-center justify-end gap-2">
                              {skill.canInstall && skill.installLabel ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 max-w-full rounded-xl"
                                  disabled={isBusy}
                                  onClick={() => handleInstallSkill(skill)}
                                >
                                  <span className="truncate">{skill.installLabel}</span>
                                </Button>
                              ) : null}
                              <SkillToggle
                                checked={skill.enabled}
                                disabled={isBusy}
                                onToggle={() => handleToggleSkill(skill)}
                              />
                            </div>

                            {isBusy ? (
                              <span className="text-right text-xs text-muted-foreground">{t('skills.saving')}</span>
                            ) : null}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-5 pt-0">
                        {skill.primaryEnv ? (
                          <div className="border-t pt-4">
                            <div className="mb-2 text-right text-xs font-medium text-muted-foreground">
                              {t('skills.apiKey')}
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                              <Input
                                type="password"
                                value={skillEdits[skill.skillKey] ?? ''}
                                onChange={(event) =>
                                  setSkillEdits((current) => ({
                                    ...current,
                                    [skill.skillKey]: event.target.value,
                                  }))
                                }
                                placeholder={skill.primaryEnv}
                                className="h-10 sm:max-w-xs"
                              />
                              <Button
                                variant="outline"
                                className="sm:min-w-[120px]"
                                disabled={isBusy}
                                onClick={() => handleSaveApiKey(skill)}
                              >
                                {t('skills.saveKey')}
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

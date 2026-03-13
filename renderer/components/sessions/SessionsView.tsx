'use client'

import React from 'react'
import { Loader2, RefreshCcw, Save, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { loadChatHistory } from '@/domain/chat/chat-service'
import { deleteSession, loadSessionsList, patchSession } from '@/domain/sessions/sessions-service'
import { useToastStore } from '@/store/toast-store'
import type { Message } from '@/store/chat-store'
import type { SessionListEntry } from '../../../shared/sessions'

function formatRelativeTime(timestamp?: number | null) {
  if (!timestamp) {
    return '-'
  }

  const diff = Math.max(0, Date.now() - timestamp)
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) {
    return 'just now'
  }

  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }

  return `${Math.floor(hours / 24)}d ago`
}

function renderValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }
  return String(value)
}

function emitSessionsUpdated() {
  window.dispatchEvent(new Event('sessions-updated'))
}

export default function SessionsView() {
  const { t } = useTranslation()
  const [sessions, setSessions] = React.useState<SessionListEntry[]>([])
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null)
  const [labelDraft, setLabelDraft] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [savingLabel, setSavingLabel] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<SessionListEntry | null>(null)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [messagesLoading, setMessagesLoading] = React.useState(false)
  const detailsCardRef = React.useRef<HTMLDivElement | null>(null)
  const [detailsCardHeight, setDetailsCardHeight] = React.useState<number | null>(null)
  const pushToast = useToastStore((state) => state.pushToast)

  const selectedSession = React.useMemo(
    () => sessions.find((session) => session.key === selectedKey) ?? null,
    [sessions, selectedKey]
  )

  const refreshSessions = React.useCallback(async (preserveKey?: string | null) => {
    setLoading(true)

    try {
      const payload = await loadSessionsList()
      const nextSessions = payload.sessions ?? []
      setSessions(nextSessions)

      const nextKey =
        preserveKey && nextSessions.some((session) => session.key === preserveKey)
          ? preserveKey
          : nextSessions[0]?.key ?? null

      setSelectedKey(nextKey)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      pushToast('error', `${t('sessions.loadFailed')}: ${message}`)
    } finally {
      setLoading(false)
    }
  }, [pushToast, t])

  React.useEffect(() => {
    void refreshSessions()
  }, [refreshSessions])

  React.useEffect(() => {
    if (!selectedKey) {
      setLabelDraft('')
      return
    }

    const current = sessions.find((session) => session.key === selectedKey) ?? null
    setLabelDraft(current?.label ?? '')
  }, [selectedKey, sessions])

  React.useEffect(() => {
    if (!selectedKey) {
      setMessages([])
      return
    }

    let active = true
    setMessagesLoading(true)

    loadChatHistory(selectedKey)
      .then((items) => {
        if (!active) {
          return
        }
        setMessages(items)
      })
      .catch((err) => {
        if (!active) {
          return
        }
        const message = err instanceof Error ? err.message : String(err)
        pushToast('error', `${t('sessions.loadMessagesFailed')}: ${message}`)
        setMessages([])
      })
      .finally(() => {
        if (active) {
          setMessagesLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [pushToast, selectedKey, t])

  React.useEffect(() => {
    const node = detailsCardRef.current
    if (!node || typeof ResizeObserver === 'undefined') {
      return
    }

    const updateHeight = () => {
      const nextHeight = Math.round(node.getBoundingClientRect().height)
      if (nextHeight > 0) {
        setDetailsCardHeight((prev) => (prev === nextHeight ? prev : nextHeight))
      }
    }

    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [])

  const handleSaveLabel = async () => {
    if (!selectedSession) {
      return
    }

    setSavingLabel(true)
    try {
      const updated = await patchSession({
        key: selectedSession.key,
        label: labelDraft.trim() || null,
      })
      const nextSessions = updated.sessions ?? []
      setSessions(nextSessions)
      emitSessionsUpdated()
      pushToast('success', t('sessions.saved'))
    } catch (err) {
      pushToast('error', `${t('sessions.patchFailed')}: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSavingLabel(false)
    }
  }

  const handleDeleteSession = async () => {
    if (!deleteTarget) {
      return
    }

    try {
      const updated = await deleteSession({
        key: deleteTarget.key,
        deleteTranscript: true,
      })
      const nextSessions = updated.sessions ?? []
      setSessions(nextSessions)
      setSelectedKey(nextSessions[0]?.key ?? null)
      emitSessionsUpdated()
      pushToast('success', t('sessions.deleted'))
      setDeleteTarget(null)
    } catch (err) {
      pushToast('error', `${t('sessions.deleteFailed')}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto bg-background p-6 lg:p-8">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col gap-6">
        <div className="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:gap-5">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('sessions.title')}</h1>
            <p className="text-sm text-muted-foreground lg:pb-1">{t('sessions.subtitle')}</p>
          </div>
          <Button
            variant="outline"
            className="rounded-2xl px-4"
            onClick={() => void refreshSessions(selectedKey)}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            {t('sessions.refresh')}
          </Button>
        </div>

        <div className="grid items-stretch gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <Card
            className="app-subpanel flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] shadow-none"
            style={detailsCardHeight ? { height: detailsCardHeight } : undefined}
          >
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold">{t('sessions.sessionList')}</CardTitle>
              <CardDescription>{t('sessions.sessionListHint')}</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 pb-6">
              {loading ? (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('sessions.refresh')}
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex h-full min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  {t('sessions.empty')}
                </div>
              ) : (
                <ScrollArea className="h-full pr-3">
                  <div className="flex flex-col gap-2">
                    {sessions.map((session) => (
                      <button
                        key={session.key}
                        type="button"
                        className={`w-full rounded-2xl border px-3 py-3 text-left text-sm transition ${
                          selectedKey === session.key
                            ? 'border-primary/18 bg-primary/10 text-foreground dark:border-primary/24 dark:bg-primary/18 dark:text-primary-foreground'
                            : 'border-border/80 bg-card/80 text-foreground hover:border-primary/14 hover:bg-primary/[0.04] dark:bg-card/65 dark:hover:border-primary/20 dark:hover:bg-primary/[0.08]'
                        }`}
                        onClick={() => setSelectedKey(session.key)}
                      >
                        <div className="truncate font-medium">{session.label?.trim() || session.displayName || session.key}</div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <div className="flex min-w-0 flex-col gap-5">
            <Card ref={detailsCardRef} className="app-subpanel h-full rounded-[30px] shadow-none">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold">{t('sessions.sessionDetails')}</CardTitle>
                <CardDescription>{t('sessions.sessionDetailsHint')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pb-6">
                {selectedSession ? (
                  <>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {t('sessions.sessionKey')}
                        </div>
                        <div className="break-all rounded-2xl border border-border/80 bg-muted/35 px-4 py-3 font-mono text-sm text-foreground">
                          {selectedSession.key}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {t('sessions.displayLabel')}
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <Input
                            value={labelDraft}
                            onChange={(event) => setLabelDraft(event.target.value)}
                            placeholder={selectedSession.label || ''}
                            className="h-11 flex-1 rounded-2xl border-border/80 bg-card/82"
                          />
                          <Button
                            className="h-11 shrink-0 rounded-2xl px-4"
                            onClick={() => void handleSaveLabel()}
                            disabled={savingLabel}
                          >
                            {savingLabel ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {savingLabel ? t('sessions.saving') : t('sessions.save')}
                          </Button>
                          <Button
                            variant="outline"
                            className="h-11 shrink-0 rounded-2xl px-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleteTarget(selectedSession)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('sessions.delete')}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 rounded-[24px] border border-border/80 bg-muted/35 p-4 text-sm text-foreground sm:grid-cols-2 xl:grid-cols-3">
                        <div>
                          <div className="text-xs text-muted-foreground">{t('sessions.displayName')}</div>
                          <div className="mt-1 font-medium">{renderValue(selectedSession.displayName || selectedSession.origin?.label)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">{t('sessions.kind')}</div>
                          <div className="mt-1 font-medium">{renderValue(selectedSession.kind)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">{t('sessions.updatedAt')}</div>
                          <div className="mt-1 font-medium">{formatRelativeTime(selectedSession.updatedAt)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">{t('sessions.channel')}</div>
                          <div className="mt-1 font-medium">{renderValue(selectedSession.lastChannel || selectedSession.deliveryContext?.channel)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">{t('sessions.model')}</div>
                          <div className="mt-1 font-medium">{renderValue(selectedSession.model)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">{t('sessions.provider')}</div>
                          <div className="mt-1 font-medium break-words">{renderValue(selectedSession.modelProvider)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">{t('sessions.contextTokens')}</div>
                          <div className="mt-1 font-medium">{renderValue(selectedSession.contextTokens)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">{t('sessions.source')}</div>
                          <div className="mt-1 font-medium">{renderValue(selectedSession.origin?.provider || selectedSession.origin?.surface)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">{t('sessions.inputTokens')}</div>
                          <div className="mt-1 font-medium">{renderValue(selectedSession.inputTokens)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">{t('sessions.outputTokens')}</div>
                          <div className="mt-1 font-medium">{renderValue(selectedSession.outputTokens)}</div>
                        </div>
                        <div className="sm:col-span-2">
                          <div className="text-xs text-muted-foreground">{t('sessions.totalTokens')}</div>
                          <div className="mt-1 font-medium">{renderValue(selectedSession.totalTokens)}</div>
                        </div>
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    {t('sessions.empty')}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="app-subpanel flex flex-col rounded-[30px] shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold">{t('sessions.messageHistory')}</CardTitle>
            <CardDescription>{selectedSession ? t('sessions.messageHistoryHint') : t('sessions.messageHistoryEmpty')}</CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            {!selectedSession ? (
                <div className="flex min-h-[140px] items-center justify-center rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                {t('sessions.messageHistoryEmpty')}
              </div>
            ) : messagesLoading ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('sessions.loadingMessages')}
              </div>
            ) : messages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                {t('sessions.noMessages')}
              </div>
            ) : (
              <ScrollArea className="h-[360px] pr-3">
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div key={message.id} className="rounded-2xl border border-border/80 bg-muted/35 px-4 py-3 text-sm text-foreground">
                      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span className="font-medium uppercase tracking-[0.18em]">{message.role}</span>
                        <span>{formatRelativeTime(message.timestamp)}</span>
                      </div>
                      <div className="mt-2 whitespace-pre-wrap break-words leading-7 text-foreground">{message.content}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {deleteTarget ? (
        <div className="app-overlay-scrim absolute inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm">
          <div className="app-dialog-shell w-full max-w-md rounded-[28px] p-6">
            <div className="text-xl font-bold text-foreground">{t('sessions.deleteConfirmTitle')}</div>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {t('sessions.deleteConfirmText', {
                name: deleteTarget.label?.trim() || deleteTarget.displayName || deleteTarget.key,
              })}
            </p>
            <div className="mt-2 break-all rounded-2xl border border-border/80 bg-muted/35 px-3 py-2 font-mono text-xs text-muted-foreground">
              {deleteTarget.key}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                className="rounded-2xl px-4"
                onClick={() => setDeleteTarget(null)}
              >
                {t('sessions.cancel')}
              </Button>
              <Button
                className="rounded-2xl bg-destructive px-4 text-destructive-foreground hover:bg-destructive/90"
                onClick={() => void handleDeleteSession()}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('sessions.delete')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}



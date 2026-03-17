'use client'

import React from 'react'
import {
  MessageSquarePlus,
  Clock,
  MessagesSquare,
  Zap,
  Radio,
  ChartColumnBig,
  Cpu,
  LayoutDashboard,
  ChevronLeft,
  FileCode2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/store/chat-store'
import { useNavigationStore } from '@/store/navigation-store'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useGatewayAvailability } from '@/hooks/useGatewayAvailability'
import { loadChatHistory } from '@/domain/chat/chat-service'
import { loadSessionsList } from '@/domain/sessions/sessions-service'
import { useSessionsSyncStore } from '@/store/sessions-sync-store'
import ConfigPreviewDialog from './ConfigPreviewDialog'
import type { SessionListEntry } from '../../../shared/sessions'

export default function Sidebar() {
  const sessions = useChatStore((state) => state.sessions)
  const currentSessionId = useChatStore((state) => state.currentSessionId)
  const setCurrentSession = useChatStore((state) => state.setCurrentSession)
  const createSession = useChatStore((state) => state.createSession)
  const ensureSession = useChatStore((state) => state.ensureSession)
  const replaceSessionMessages = useChatStore((state) => state.replaceSessionMessages)
  const currentView = useNavigationStore((state) => state.currentView)
  const sidebarCollapsed = useNavigationStore((state) => state.sidebarCollapsed)
  const setCurrentView = useNavigationStore((state) => state.setCurrentView)
  const toggleSidebarCollapsed = useNavigationStore((state) => state.toggleSidebarCollapsed)
  const { t } = useTranslation()
  const { gatewayConnected } = useGatewayAvailability()
  const refreshSignal = useSessionsSyncStore((state) => state.refreshSignal)
  const [isClient, setIsClient] = React.useState(false)
  const [historySessions, setHistorySessions] = React.useState<SessionListEntry[]>([])
  const [loadingHistoryId, setLoadingHistoryId] = React.useState<string | null>(null)
  const [configPreviewOpen, setConfigPreviewOpen] = React.useState(false)

  React.useEffect(() => {
    setIsClient(true)
  }, [])

  React.useEffect(() => {
    if (!isClient) {
      return
    }

    if (!gatewayConnected) {
      setHistorySessions([])
      return
    }

    let active = true

    void loadSessionsList()
      .then((payload) => {
        if (!active) {
          return
        }
        setHistorySessions(payload.sessions ?? [])
      })
      .catch((error) => {
        console.error('Failed to load sessions list', error)
      })

    return () => {
      active = false
    }
  }, [gatewayConnected, isClient, refreshSignal])

  const NAV_ITEMS = [
    { icon: MessageSquarePlus, label: isClient ? t('nav.newChat') : '...', id: 'new-chat', action: () => { createSession(); setCurrentView('chat') } },
    { icon: LayoutDashboard, label: isClient ? t('nav.dashboard') : '...', id: 'dashboard', action: () => setCurrentView('dashboard') },
    { icon: MessagesSquare, label: isClient ? t('nav.sessions') : '...', id: 'sessions', action: () => setCurrentView('sessions') },
    { icon: Zap, label: isClient ? t('nav.skills') : '...', id: 'skills', action: () => setCurrentView('skills') },
    { icon: Radio, label: isClient ? t('nav.channels') : '...', id: 'channels', action: () => setCurrentView('channels') },
    { icon: Cpu, label: isClient ? t('nav.models') : '...', id: 'models', action: () => setCurrentView('models') },
    { icon: Clock, label: isClient ? t('nav.scheduled') : '...', id: 'cron', action: () => setCurrentView('cron') },
    { icon: ChartColumnBig, label: isClient ? t('nav.usage') : '...', id: 'usage', action: () => setCurrentView('usage') },
  ]

  if (!isClient) return null

  const mainNavItems = NAV_ITEMS.filter(item => item.id !== 'new-chat');
  const historyItems = historySessions.length > 0
    ? historySessions.map((session) => ({
        id: session.key,
        title: session.label?.trim() || session.displayName || session.key,
        updatedAt: session.updatedAt ?? 0,
      }))
    : sessions.map((session) => ({
        id: session.id,
        title: session.id,
        updatedAt: session.updatedAt,
      }))

  return (
    <div className={cn(
      "app-soft-surface flex h-full flex-col overflow-hidden border-r px-3 py-4 transition-all",
      sidebarCollapsed ? "w-24" : "w-72"
    )}>
      <div className="flex shrink-0 flex-col gap-1">
        <Button
            className="app-solid-primary mb-2 w-full justify-start gap-3 rounded-2xl"
            onClick={() => { createSession(); setCurrentView('chat') }}
        >
            <MessageSquarePlus className="h-4 w-4" />
            {!sidebarCollapsed ? <span>{isClient ? t('nav.newChat') : '...'}</span> : null}
        </Button>

        {mainNavItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className={cn(
              "w-full gap-3 rounded-2xl px-3 py-2.5",
              sidebarCollapsed ? "justify-center" : "justify-start",
              currentView === item.id
                ? "app-nav-active"
                : "app-nav-idle"
            )}
            onClick={item.action}
          >
            <item.icon className="h-4 w-4" />
            {!sidebarCollapsed ? <span>{item.label}</span> : null}
          </Button>
        ))}
      </div>

      {!sidebarCollapsed ? (
        <div className="app-subpanel mt-4 flex min-h-0 flex-1 flex-col px-3 py-3">
          <div className="px-2 pb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('nav.history', 'History')}
          </div>
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-1 pr-3">
              {historyItems.map((session) => (
                <Button
                  key={session.id}
                  variant="ghost"
                  className={cn(
                    "h-auto w-full justify-start rounded-2xl px-3 py-3 text-sm",
                    currentSessionId === session.id 
                      ? "app-history-active" 
                      : "app-history-idle"
                  )}
                  onClick={async () => {
                    setLoadingHistoryId(session.id)
                    ensureSession({
                      id: session.id,
                      title: session.title,
                      updatedAt: session.updatedAt,
                    })
                    try {
                      if (gatewayConnected) {
                        const history = await loadChatHistory(session.id)
                        replaceSessionMessages(session.id, history)
                      }
                    } catch (error) {
                      console.error('Failed to load chat history', error)
                    } finally {
                      setLoadingHistoryId(null)
                    }
                    setCurrentSession(session.id)
                    setCurrentView('chat')
                  }}
                >
                    <div className="min-w-0 w-full text-left">
                    <div className="truncate font-medium">{loadingHistoryId === session.id ? `${session.title} ...` : session.title || session.id}</div>
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      ) : (
        <div className="mt-4 flex min-h-0 flex-1 flex-col items-center gap-2 pt-2">
          {historyItems.slice(0, 5).map((session) => (
            <Button
              key={session.id}
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 rounded-2xl",
                currentSessionId === session.id
                  ? "app-history-active"
                  : "app-history-idle"
              )}
              onClick={async () => {
                setLoadingHistoryId(session.id)
                ensureSession({
                  id: session.id,
                  title: session.title,
                  updatedAt: session.updatedAt,
                })
                try {
                  if (gatewayConnected) {
                    const history = await loadChatHistory(session.id)
                    replaceSessionMessages(session.id, history)
                  }
                } catch (error) {
                  console.error('Failed to load chat history', error)
                } finally {
                  setLoadingHistoryId(null)
                }
                setCurrentSession(session.id)
                setCurrentView('chat')
              }}
              title={session.title}
            >
              <MessagesSquare className="h-4 w-4" />
            </Button>
          ))}
        </div>
      )}

      <div className="mt-4 flex shrink-0 items-center justify-between rounded-2xl border border-border/70 bg-card/72 px-2 py-2">
        <Button
          type="button"
          variant="ghost"
          className={cn(
            'h-9 rounded-xl px-2 text-muted-foreground hover:bg-accent hover:text-foreground',
            sidebarCollapsed ? 'w-9 justify-center px-0' : 'flex-1 justify-start gap-2'
          )}
          onClick={() => setConfigPreviewOpen(true)}
          title={t('models.previewTitle')}
        >
          <FileCode2 className="h-4 w-4" />
          {!sidebarCollapsed ? (
            <div className="flex min-w-0 flex-col items-start">
              <span className="truncate text-xs text-muted-foreground">{t('app.footerLabel')}</span>
              <span className="truncate text-[11px] text-muted-foreground/80">{t('models.previewTitle')}</span>
            </div>
          ) : null}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground" onClick={toggleSidebarCollapsed}>
            <ChevronLeft className={cn("h-4 w-4 transition-transform", sidebarCollapsed && "rotate-180")} />
        </Button>
      </div>

      <ConfigPreviewDialog open={configPreviewOpen} onOpenChange={setConfigPreviewOpen} />
    </div>
  )
}






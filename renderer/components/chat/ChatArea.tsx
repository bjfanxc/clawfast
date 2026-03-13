'use client'

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AlertCircle, Brain, RotateCcw } from 'lucide-react'
import { useChatStore } from '@/store/chat-store'
import WelcomeScreen from './WelcomeScreen'
import ChatInput from './ChatInput'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useGatewayChatSync } from '@/hooks/useGatewayChatSync'
import { useGatewayConnectionState } from '@/hooks/useGatewayConnectionState'
import { useTranslation } from 'react-i18next'
import { sendChatMessage } from '@/domain/chat/chat-service'

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ChatArea Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div className="p-4 text-red-500">Something went wrong: {this.state.error?.message}</div>;
    }
    return this.props.children;
  }
}

function ChatAreaContent() {
  const { t } = useTranslation()
  const sessions = useChatStore((state) => state.sessions)
  const currentSessionId = useChatStore((state) => state.currentSessionId)
  const addMessage = useChatStore((state) => state.addMessage)
  const updateMessage = useChatStore((state) => state.updateMessage)
  const currentSession = sessions.find((s) => s.id === currentSessionId)
  const messages = currentSession?.messages || []
  const visibleMessages = messages.filter((message) => Boolean(message.content?.trim()))
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [waitingReply, setWaitingReply] = useState(false)
  const { gatewayError } = useGatewayConnectionState()
  const previousGatewayErrorRef = useRef<string | null>(null)

  useGatewayChatSync(currentSessionId)

  // Track whether user is near the bottom to avoid hijacking scroll.
  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const threshold = 64
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    setIsAtBottom(distance <= threshold)
  }

  // Auto-scroll to bottom when new messages arrive (only if user is already near bottom).
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || !isAtBottom) return
    const raf = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
    return () => cancelAnimationFrame(raf)
  }, [isAtBottom, messages.length, messages[messages.length - 1]?.content])

  useEffect(() => {
    const handleUserSent = () => {
      setWaitingReply(true)
      setIsAtBottom(true)
      const el = scrollRef.current
      if (!el) return
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight
      })
    }

    const handleAssistantActivity = () => {
      setWaitingReply(false)
    }

    window.addEventListener('chat-user-sent', handleUserSent)
    window.addEventListener('chat-assistant-activity', handleAssistantActivity)

    return () => {
      window.removeEventListener('chat-user-sent', handleUserSent)
      window.removeEventListener('chat-assistant-activity', handleAssistantActivity)
    }
  }, [])

  // When switching sessions, jump to bottom immediately.
  useEffect(() => {
    if (!currentSessionId) {
      previousGatewayErrorRef.current = gatewayError
      return
    }

    if (previousGatewayErrorRef.current && !gatewayError) {
      addMessage(currentSessionId, {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: t('chat.gatewayRecovered'),
        timestamp: Date.now(),
        status: 'sent',
        error: null,
      })
      window.dispatchEvent(new Event('chat-assistant-activity'))
    }

    previousGatewayErrorRef.current = gatewayError
  }, [addMessage, currentSessionId, gatewayError, t])

  useEffect(() => {
    setIsAtBottom(true)
    setWaitingReply(false)
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [currentSessionId])

  if (!currentSession) {
    return <WelcomeScreen />
  }

  const retryMessage = (messageId: string, content: string) => {
    if (!currentSessionId) return

    updateMessage(currentSessionId, messageId, {
      status: 'sending',
      error: null,
    })

    try {
      const request = sendChatMessage(currentSessionId, content)
      updateMessage(currentSessionId, messageId, {
        status: 'sent',
        error: null,
        runId: request.runId,
      })
    } catch (error) {
      updateMessage(currentSessionId, messageId, {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const openExternalLink = async (href?: string) => {
    if (!href || !window.ipc?.openExternal) {
      return
    }

    try {
      await window.ipc.openExternal(href)
    } catch (error) {
      console.error('Failed to open external link', error)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background p-6 lg:p-8">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col gap-5">
        {gatewayError ? (
          <div className="shrink-0 rounded-3xl border border-primary/16 bg-primary/10 px-4 py-3 text-sm text-foreground dark:border-primary/24 dark:bg-primary/18 dark:text-primary-foreground">
            {t('chat.gatewayError', { message: gatewayError })}
          </div>
        ) : null}

        <div className="app-subpanel shrink-0 flex items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {t('chat.activeSession')}
            </div>
            <div className="mt-1 text-lg font-semibold text-foreground">
              {currentSession.title || currentSession.id}
            </div>
          </div>
          <div className="rounded-full border border-border/80 bg-muted/35 px-3 py-1 text-xs font-medium text-muted-foreground">
            {t('chat.messageCount', { count: visibleMessages.length })}
          </div>
        </div>

        <div className="app-subpanel flex min-h-0 flex-1 flex-col overflow-hidden bg-card px-5 py-5">
          {visibleMessages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-center text-muted-foreground">
              <div className="flex max-w-md flex-col items-center">
                <Brain className="mb-4 h-12 w-12 opacity-20" />
                <p>{t('chat.empty')}</p>
              </div>
            </div>
          ) : (
            <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto pr-2">
              <div className="space-y-4">
                {visibleMessages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "mb-4 flex w-full gap-3",
                      message.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === 'assistant' && (
                      <Avatar className="mt-1 h-9 w-9 border border-white/80 shadow-sm dark:border-white/10">
                        <AvatarImage src="/images/logo.png" />
                        <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                    )}

                    <div
                      className={cn(
                        "max-w-[85%] rounded-[24px] border px-5 py-3 text-sm leading-7 shadow-sm",
                        message.role === 'user'
                          ? "rounded-br-md border-primary bg-primary text-primary-foreground shadow-[0_20px_40px_-28px_hsl(var(--primary)/0.7)]"
                          : "rounded-bl-md border-border/80 bg-muted/35 text-foreground dark:bg-surface/90"
                      )}
                    >
                      <div className="prose prose-sm break-words dark:prose-invert">
                        {message.role === 'assistant' ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              a: ({ href, children, ...props }) => (
                                <a
                                  {...props}
                                  href={href}
                                  onClick={(event) => {
                                    event.preventDefault()
                                    void openExternalLink(href)
                                  }}
                                  className="text-primary underline underline-offset-4 hover:text-primary/80"
                                >
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        ) : (
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        )}
                      </div>
                      {message.role === 'user' && message.status !== 'sent' ? (
                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/20 pt-3 text-xs text-white/85">
                          <div className="flex items-center gap-2">
                            {message.status === 'sending' ? (
                              <span>{t('chat.messageStatus.sending')}</span>
                            ) : (
                              <>
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span>{message.error || t('chat.messageStatus.error')}</span>
                              </>
                            )}
                          </div>
                          {message.status === 'error' ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-7 rounded-xl bg-white/15 px-2 text-white hover:bg-white/25"
                              onClick={() => retryMessage(message.id, message.content)}
                            >
                              <RotateCcw className="mr-1 h-3.5 w-3.5" />
                              {t('chat.retry')}
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {message.role === 'user' && (
                      <Avatar className="mt-1 h-9 w-9 border border-white/80 shadow-sm dark:border-white/10">
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                {waitingReply ? (
                  <div className="flex w-full items-start gap-3">
                    <Avatar className="mt-1 h-9 w-9 border border-white/80 shadow-sm dark:border-white/10">
                      <AvatarImage src="/images/logo.png" />
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                    <div className="max-w-[85%] rounded-[24px] rounded-bl-md border border-border/80 bg-muted/35 px-5 py-3 text-sm text-foreground shadow-sm dark:bg-surface/90">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="chat-typing-dots">
                          <span className="chat-typing-dot" />
                          <span className="chat-typing-dot" />
                          <span className="chat-typing-dot" />
                          <span className="chat-typing-dot" />
                          <span className="chat-typing-dot" />
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}
</div>
            </div>
          )}
        </div>
      </div>
      <div className="pb-4 pt-3">
        <div className="mx-auto w-full max-w-7xl">
            <ChatInput />
        </div>
      </div>
    </div>
  )
}

export default function ChatArea() {
  return (
    <ErrorBoundary>
      <ChatAreaContent />
    </ErrorBoundary>
  )
}




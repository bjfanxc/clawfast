'use client'

import React, { useState } from 'react'
import { Loader2, Paperclip, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useChatStore } from '@/store/chat-store'
import { useTranslation } from 'react-i18next'
import { useNavigationStore } from '@/store/navigation-store'
import { sendChatMessage } from '@/domain/chat/chat-service'

export default function ChatInput() {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const currentSessionId = useChatStore((state) => state.currentSessionId)
  const addMessage = useChatStore((state) => state.addMessage)
  const updateMessage = useChatStore((state) => state.updateMessage)
  const setCurrentView = useNavigationStore((state) => state.setCurrentView)
  const { t } = useTranslation()

  const handleSend = async () => {
    if (!value.trim() || !currentSessionId || submitting) return

    const content = value.trim()
    setValue('') // Clear input immediately
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setSubmitting(true)
    const runId = `pending-${Date.now()}`

    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user' as const,
      content,
      timestamp: Date.now(),
      status: 'sending' as const,
      error: null,
      runId,
    }
    
    addMessage(currentSessionId, userMessage)
    setCurrentView('chat')
    window.dispatchEvent(new Event('chat-user-sent'))

    try {
      const request = sendChatMessage(currentSessionId, content)
      updateMessage(currentSessionId, userMessage.id, {
        status: 'sent',
        error: null,
        runId: request.runId,
      })
      window.dispatchEvent(new Event('sessions-updated'))
      window.setTimeout(() => {
        window.dispatchEvent(new Event('sessions-updated'))
      }, 1200)
    } catch (err) {
      console.error('Failed to send message:', err)
      updateMessage(currentSessionId, userMessage.id, {
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="relative mx-auto flex w-full flex-col">
      <div className="app-subpanel relative flex items-end rounded-[24px] border border-border/80 bg-card px-4 py-3 shadow-sm ring-0 backdrop-blur-xl transition-shadow focus-within:border-primary/28 focus-within:shadow-[0_24px_60px_-42px_hsl(var(--primary)/0.35)] dark:bg-surface/90">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.placeholder')}
          className="min-h-[24px] max-h-[200px] w-full resize-none overflow-hidden border-0 bg-transparent px-3 py-2 text-[15px] focus-visible:ring-0 focus-visible:ring-offset-0"
          rows={1}
          style={{ height: 'auto' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
          }}
        />
        <Button
          size="icon"
          className="app-solid-primary h-11 w-11 shrink-0 rounded-xl shadow-[0_18px_36px_-24px_hsl(var(--primary)/0.55)]"
          disabled={!value.trim() || submitting}
          onClick={handleSend}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}



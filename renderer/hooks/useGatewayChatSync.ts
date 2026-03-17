'use client'

import React from 'react'

import { useChatStore } from '@/store/chat-store'
import { useChatUiSyncStore } from '@/store/chat-ui-sync-store'
import { useSessionsSyncStore } from '@/store/sessions-sync-store'
import { subscribeGatewayMessages } from '@/domain/gateway/gateway-service'
import { applyGatewayChatMessage } from '@/lib/chat/gateway-events'

export function useGatewayChatSync(currentSessionId: string | null) {
  const addMessage = useChatStore((state) => state.addMessage)
  const appendMessageContent = useChatStore((state) => state.appendMessageContent)
  const updateMessage = useChatStore((state) => state.updateMessage)
  const notifyAssistantActivity = useChatUiSyncStore((state) => state.notifyAssistantActivity)
  const requestSessionsRefresh = useSessionsSyncStore((state) => state.requestRefresh)
  const assistantMessageIdsRef = React.useRef<Map<string, string>>(new Map())
  const sessionRefreshRunsRef = React.useRef<Set<string>>(new Set())

  React.useEffect(() => {
    if (!currentSessionId) return

    assistantMessageIdsRef.current.clear()
    sessionRefreshRunsRef.current.clear()

    const triggerSessionsRefresh = (runId: string) => {
      if (sessionRefreshRunsRef.current.has(runId)) {
        return
      }
      sessionRefreshRunsRef.current.add(runId)
      requestSessionsRefresh()
      notifyAssistantActivity()
    }

    try {
      return subscribeGatewayMessages((message) => {
        try {
          applyGatewayChatMessage(message, {
            currentSessionId,
            hasAssistantMessage: (runId) => assistantMessageIdsRef.current.has(runId),
            createAssistantMessage: (runId, content) => {
              const messageId = `msg-${Date.now()}`
              assistantMessageIdsRef.current.set(runId, messageId)
              addMessage(currentSessionId, {
                id: messageId,
                role: 'assistant',
                content,
                timestamp: Date.now(),
                status: 'sent',
                error: null,
                runId,
              })
            },
            appendAssistantMessage: (runId, content) => {
              const messageId = assistantMessageIdsRef.current.get(runId)
              if (!messageId) return
              appendMessageContent(currentSessionId, messageId, content)
            },
            replaceAssistantMessage: (runId, content) => {
              const messageId = assistantMessageIdsRef.current.get(runId)
              if (!messageId) return
              updateMessage(currentSessionId, messageId, {
                content,
                status: 'sent',
                error: null,
              })
            },
            onSessionActivity: triggerSessionsRefresh,
            onChatError: (runId, message) => {
              const errorMessageId = `msg-${Date.now()}`
              addMessage(currentSessionId, {
                id: errorMessageId,
                role: 'assistant',
                content: message,
                timestamp: Date.now(),
                status: 'error',
                error: message,
                runId: `${runId}-error`,
              })
            },
          })
        } catch (error) {
          console.error('Failed to parse gateway message', error)
        }
      })
    } catch (error) {
      console.error('Failed to subscribe to gateway messages', error)
      return
    }
  }, [addMessage, appendMessageContent, currentSessionId, notifyAssistantActivity, requestSessionsRefresh, updateMessage])
}

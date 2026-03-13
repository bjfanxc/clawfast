import { extractText } from './message-extract'
import {
  isGatewayAssistantStreamEvent,
  isGatewayChatFinalEvent,
  parseGatewayMessage,
} from '../../../shared/gateway'

interface GatewayChatHandlers {
  currentSessionId: string
  hasAssistantMessage: (runId: string) => boolean
  createAssistantMessage: (runId: string, content: string) => void
  appendAssistantMessage: (runId: string, content: string) => void
  replaceAssistantMessage: (runId: string, content: string) => void
  onSessionActivity?: (runId: string) => void
  onChatError?: (runId: string, message: string) => void
}

function isRelevantSession(eventSessionKey: string, currentSessionId: string) {
  if (!eventSessionKey) {
    return true
  }

  return (
    eventSessionKey === currentSessionId ||
    eventSessionKey.endsWith(`:${currentSessionId}`) ||
    currentSessionId.endsWith(`:${eventSessionKey}`)
  )
}

export function applyGatewayChatMessage(rawMessage: string, handlers: GatewayChatHandlers) {
  const data = parseGatewayMessage(rawMessage)

  if (!isGatewayAssistantStreamEvent(data) && !isGatewayChatFinalEvent(data)) return

  const eventSessionKey = data.payload?.sessionKey || ''
  if (!isRelevantSession(eventSessionKey, handlers.currentSessionId)) return

  if (isGatewayAssistantStreamEvent(data) && data.payload.stream === 'assistant') {
    const runId = data.payload.runId
    const innerData = data.payload.data || {}
    const deltaText = innerData.delta || innerData.text || ''

    if (!deltaText) return

    if (handlers.hasAssistantMessage(runId)) {
      handlers.appendAssistantMessage(runId, deltaText)
    } else {
      handlers.createAssistantMessage(runId, deltaText)
    }
    handlers.onSessionActivity?.(runId)
    return
  }

  if (isGatewayChatFinalEvent(data) && data.payload.state === 'error') {
    const runId = data.payload.runId
    const errorMessage =
      typeof data.payload.errorMessage === 'string'
        ? data.payload.errorMessage
        : extractText(data.payload.message || {}) || 'Request failed'

    handlers.onChatError?.(runId, errorMessage)
    handlers.onSessionActivity?.(runId)
    return
  }

  if (isGatewayChatFinalEvent(data) && data.payload.state === 'final') {
    const runId = data.payload.runId
    const messageContent = extractText(data.payload.message || {}) || ''

    if (handlers.hasAssistantMessage(runId)) {
      if (messageContent) {
        handlers.replaceAssistantMessage(runId, messageContent)
      }
    } else {
      handlers.createAssistantMessage(runId, messageContent)
    }
    handlers.onSessionActivity?.(runId)
  }
}

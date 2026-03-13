import type { Message } from '@/store/chat-store'
import type { ChatHistoryResponse } from '../../../shared/chat'
import type { GatewaySendChatRequest } from '../../../shared/gateway'
import { isGatewayConnected } from '@/domain/gateway/gateway-guard'

function createRunId() {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function createChatRequest(sessionKey: string, message: string, runId: string): GatewaySendChatRequest {
  return {
    type: 'req',
    id: `req-${Date.now()}`,
    method: 'chat.send',
    params: {
      sessionKey,
      message,
      deliver: true,
      idempotencyKey: runId,
    },
  }
}

export function sendChatMessage(sessionKey: string, message: string) {
  if (!window.ipc?.gateway) {
    throw new Error('IPC Gateway not available')
  }

  const runId = createRunId()
  const request = createChatRequest(sessionKey, message, runId)
  window.ipc.gateway.send(request)
  return { runId }
}

function extractText(message: unknown): string {
  if (!message || typeof message !== 'object') {
    return ''
  }

  const entry = message as Record<string, unknown>

  if (typeof entry.text === 'string') {
    return entry.text
  }

  if (typeof entry.content === 'string') {
    return entry.content
  }

  if (Array.isArray(entry.content)) {
    const parts = entry.content
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null
        }

        const block = item as Record<string, unknown>
        if (typeof block.text === 'string') {
          return block.text
        }

        return null
      })
      .filter((part): part is string => Boolean(part))

    return parts.join('\n')
  }

  return ''
}

function isSilentAssistantReply(message: unknown) {
  if (!message || typeof message !== 'object') {
    return false
  }

  const entry = message as Record<string, unknown>
  const role = typeof entry.role === 'string' ? entry.role.toLowerCase() : ''
  if (role !== 'assistant') {
    return false
  }

  return /^\s*NO_REPLY\s*$/.test(extractText(message))
}

function normalizeHistoryMessage(message: unknown, index: number): Message | null {
  if (!message || typeof message !== 'object') {
    return null
  }

  const entry = message as Record<string, unknown>
  const role = typeof entry.role === 'string' ? entry.role.toLowerCase() : ''
  if (role !== 'user' && role !== 'assistant') {
    return null
  }

  if (isSilentAssistantReply(message)) {
    return null
  }

  const content = extractText(message)
  if (!content.trim()) {
    return null
  }

  const timestamp =
    typeof entry.timestamp === 'number'
      ? entry.timestamp
      : typeof entry.createdAt === 'number'
        ? entry.createdAt
        : Date.now() + index

  return {
    id:
      typeof entry.id === 'string'
        ? entry.id
        : typeof entry.messageId === 'string'
          ? entry.messageId
          : `history-${index}-${timestamp}`,
    role,
    content,
    timestamp,
    status: 'sent',
    error: null,
    runId: typeof entry.runId === 'string' ? entry.runId : null,
  }
}

export async function loadChatHistory(sessionKey: string): Promise<Message[]> {
  if (!window.ipc?.chat) {
    throw new Error('Chat API is not available')
  }

  if (!(await isGatewayConnected())) {
    return []
  }

  const response = await window.ipc.chat.history(sessionKey) as ChatHistoryResponse
  const messages = Array.isArray(response?.messages) ? response.messages : []

  return messages
    .map((message, index) => normalizeHistoryMessage(message, index))
    .filter((message): message is Message => Boolean(message))
}

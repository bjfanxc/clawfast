import type { GatewayClient } from '../gateway/client'
import type { ChatHistoryResponse } from '../../shared/chat'

export async function getChatHistory(client: GatewayClient, sessionKey: string): Promise<ChatHistoryResponse> {
  return client.request<ChatHistoryResponse>('chat.history', {
    sessionKey,
    limit: 200,
  })
}

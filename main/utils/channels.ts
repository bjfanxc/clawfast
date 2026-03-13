import type { GatewayClient } from '../gateway/client'
import type { ChannelsSnapshot, ChannelsStatusSnapshot, ListChannelsOptions } from '../../shared/channels'

export async function listChannels(
  client: GatewayClient,
  options?: ListChannelsOptions,
): Promise<ChannelsSnapshot> {
  const snapshot = await client.request<ChannelsStatusSnapshot | null>('channels.status', {
    probe: Boolean(options?.probe),
    timeoutMs: 8000,
  })

  return {
    snapshot,
    lastSuccessAt: snapshot?.ts ?? Date.now(),
  }
}

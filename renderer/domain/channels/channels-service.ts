import type { ChannelsSnapshot } from '../../../shared/channels'
import { getOfflineChannelsSnapshot, isGatewayConnected } from '@/domain/gateway/gateway-guard'

export async function loadChannelsSnapshot(probe = false): Promise<ChannelsSnapshot> {
  if (!window.ipc?.channels) {
    throw new Error('Channels API is not available')
  }

  if (!(await isGatewayConnected())) {
    return getOfflineChannelsSnapshot()
  }

  return window.ipc.channels.list(probe)
}

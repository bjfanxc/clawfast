import type { ChannelsSnapshot } from '../../../shared/channels'
import { getOfflineChannelsSnapshot, isGatewayConnected } from '@/domain/gateway/gateway-guard'
import { getIpcNamespace } from '@/domain/ipc/ipc-client'

export async function loadChannelsSnapshot(probe = false): Promise<ChannelsSnapshot> {
  const channels = getIpcNamespace('channels', 'Channels API is not available')

  if (!(await isGatewayConnected())) {
    return getOfflineChannelsSnapshot()
  }

  return channels.list(probe)
}

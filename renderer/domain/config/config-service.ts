import type { ConfigSetPayload, ConfigSnapshot } from '../../../shared/config'
import { getOfflineConfigSnapshot, isGatewayConnected } from '@/domain/gateway/gateway-guard'

export async function loadConfigSnapshot(): Promise<ConfigSnapshot> {
  if (!window.ipc?.config) {
    throw new Error('Config API is not available')
  }

  if (!(await isGatewayConnected())) {
    return getOfflineConfigSnapshot()
  }

  return window.ipc.config.get()
}

export async function saveConfigSnapshot(payload: ConfigSetPayload): Promise<ConfigSnapshot> {
  if (!window.ipc?.config) {
    throw new Error('Config API is not available')
  }

  return window.ipc.config.set(payload)
}

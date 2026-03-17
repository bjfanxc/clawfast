import type { ConfigSetPayload, ConfigSnapshot } from '../../../shared/config'
import { getOfflineConfigSnapshot, isGatewayConnected } from '@/domain/gateway/gateway-guard'
import { getIpcNamespace } from '@/domain/ipc/ipc-client'

export async function loadConfigSnapshot(): Promise<ConfigSnapshot> {
  const config = getIpcNamespace('config', 'Config API is not available')

  if (!(await isGatewayConnected())) {
    return getOfflineConfigSnapshot()
  }

  return config.get()
}

export async function saveConfigSnapshot(payload: ConfigSetPayload): Promise<ConfigSnapshot> {
  const config = getIpcNamespace('config', 'Config API is not available')
  return config.set(payload)
}

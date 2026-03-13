import type { GatewayClient } from '../gateway/client'
import type { ConfigSetPayload, ConfigSnapshot } from '../../shared/config'

export async function getConfigSnapshot(client: GatewayClient): Promise<ConfigSnapshot> {
  return client.request('config.get', {}) as Promise<ConfigSnapshot>
}

export async function setConfigSnapshot(client: GatewayClient, payload: ConfigSetPayload): Promise<ConfigSnapshot> {
  return client.request('config.set', payload) as Promise<ConfigSnapshot>
}

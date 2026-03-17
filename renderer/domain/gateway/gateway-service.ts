import type { GatewayConnectionState, GatewayStatusRequest } from '../../../shared/gateway'
import { getIpcNamespace } from '@/domain/ipc/ipc-client'

export function subscribeGatewayMessages(callback: (message: string) => void) {
  const gateway = getIpcNamespace('gateway', 'Gateway API is not available')
  return gateway.onMessage(callback)
}

export function subscribeGatewayErrors(callback: (message: string) => void) {
  const gateway = getIpcNamespace('gateway', 'Gateway API is not available')
  return gateway.onError(callback)
}

export function requestGatewayStatus() {
  const gateway = getIpcNamespace('gateway', 'Gateway API is not available')
  const request: GatewayStatusRequest = { type: 'get-status' }
  gateway.send(request)
}

export function getGatewayConnectionState(): Promise<GatewayConnectionState> {
  const gateway = getIpcNamespace('gateway', 'Gateway API is not available')
  return gateway.getState()
}

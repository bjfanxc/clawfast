import type { GatewayConnectionState, GatewayStatusRequest } from '../../../shared/gateway'

export function subscribeGatewayMessages(callback: (message: string) => void) {
  if (!window.ipc?.gateway) {
    throw new Error('Gateway API is not available')
  }

  return window.ipc.gateway.onMessage(callback)
}

export function subscribeGatewayErrors(callback: (message: string) => void) {
  if (!window.ipc?.gateway) {
    throw new Error('Gateway API is not available')
  }

  return window.ipc.gateway.onError(callback)
}

export function requestGatewayStatus() {
  if (!window.ipc?.gateway) {
    throw new Error('Gateway API is not available')
  }

  const request: GatewayStatusRequest = { type: 'get-status' }
  window.ipc.gateway.send(request)
}

export function getGatewayConnectionState(): Promise<GatewayConnectionState> {
  if (!window.ipc?.gateway) {
    throw new Error('Gateway API is not available')
  }

  return window.ipc.gateway.getState()
}

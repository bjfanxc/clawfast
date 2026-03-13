import type { SessionsDeletePayload, SessionsListPayload, SessionsPatchPayload } from '../../../shared/sessions'
import { getOfflineSessionsList, isGatewayConnected } from '@/domain/gateway/gateway-guard'

export async function loadSessionsList(): Promise<SessionsListPayload> {
  if (!window.ipc?.sessions) {
    throw new Error('Sessions API is not available')
  }

  if (!(await isGatewayConnected())) {
    return getOfflineSessionsList()
  }

  return window.ipc.sessions.list()
}

export async function patchSession(payload: SessionsPatchPayload): Promise<SessionsListPayload> {
  if (!window.ipc?.sessions) {
    throw new Error('Sessions API is not available')
  }

  return window.ipc.sessions.patch(payload)
}

export async function deleteSession(payload: SessionsDeletePayload): Promise<SessionsListPayload> {
  if (!window.ipc?.sessions) {
    throw new Error('Sessions API is not available')
  }

  return window.ipc.sessions.delete(payload)
}

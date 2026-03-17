import type { SessionsDeletePayload, SessionsListPayload, SessionsPatchPayload } from '../../../shared/sessions'
import { getOfflineSessionsList, isGatewayConnected } from '@/domain/gateway/gateway-guard'
import { getIpcNamespace } from '@/domain/ipc/ipc-client'

export async function loadSessionsList(): Promise<SessionsListPayload> {
  const sessions = getIpcNamespace('sessions', 'Sessions API is not available')

  if (!(await isGatewayConnected())) {
    return getOfflineSessionsList()
  }

  return sessions.list()
}

export async function patchSession(payload: SessionsPatchPayload): Promise<SessionsListPayload> {
  const sessions = getIpcNamespace('sessions', 'Sessions API is not available')
  return sessions.patch(payload)
}

export async function deleteSession(payload: SessionsDeletePayload): Promise<SessionsListPayload> {
  const sessions = getIpcNamespace('sessions', 'Sessions API is not available')
  return sessions.delete(payload)
}

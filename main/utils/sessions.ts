import type { GatewayClient } from '../gateway/client'
import type { SessionsListPayload, SessionsPatchPayload, SessionsDeletePayload } from '../../shared/sessions'

export async function listSessions(client: GatewayClient): Promise<SessionsListPayload> {
  return client.request<SessionsListPayload>('sessions.list', {
    includeGlobal: true,
    includeUnknown: false,
    limit: 120,
  })
}

export async function patchSession(
  client: GatewayClient,
  payload: SessionsPatchPayload
): Promise<SessionsListPayload> {
  const params: Record<string, unknown> = {
    key: payload.key,
  }

  if ('label' in payload) {
    params.label = payload.label
  }

  if ('thinkingLevel' in payload) {
    params.thinkingLevel = payload.thinkingLevel
  }

  if ('verboseLevel' in payload) {
    params.verboseLevel = payload.verboseLevel
  }

  if ('reasoningLevel' in payload) {
    params.reasoningLevel = payload.reasoningLevel
  }

  await client.request('sessions.patch', params)
  return listSessions(client)
}

export async function deleteSession(
  client: GatewayClient,
  payload: SessionsDeletePayload
): Promise<SessionsListPayload> {
  await client.request('sessions.delete', {
    key: payload.key,
    deleteTranscript: payload.deleteTranscript ?? true,
  })

  return listSessions(client)
}

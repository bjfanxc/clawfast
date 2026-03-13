export interface GatewayStatus {
  version: string
  uptime: number
  memory: {
    rss: number
    heapTotal: number
    heapUsed: number
    external: number
  }
  channels: Array<{
    id: string
    status: 'connected' | 'disconnected'
    type: string
  }>
  activeSessions: number
  cpuLoad: number
}

export interface GatewayConnectChallengeEvent {
  type: 'event'
  event: 'connect.challenge'
  payload?: {
    nonce?: string
  }
}

export interface GatewayAssistantStreamEvent {
  type: 'event'
  event: 'agent'
  payload: {
    runId: string
    sessionKey?: string
    stream: 'assistant'
    data?: {
      delta?: string
      text?: string
    }
  }
}

export interface GatewayChatFinalEvent {
  type: 'event'
  event: 'chat'
  payload: {
    runId: string
    sessionKey?: string
    state: 'final' | 'delta' | 'error'
    message?: unknown
    errorMessage?: string
  }
}

export interface GatewayHealthEventPayload {
  ts?: number
  heartbeatSeconds?: number
  channels?: Record<string, unknown>
  channelOrder?: string[]
  channelLabels?: Record<string, string>
  defaultAgentId?: string
  agents?: Array<{
    agentId?: string
    isDefault?: boolean
    heartbeat?: {
      enabled?: boolean
      every?: string
      everyMs?: number
    }
  }>
  sessions?: {
    path?: string
    count?: number
    recent?: Array<{
      key?: string
      updatedAt?: number
      age?: number
    }>
  }
}

export interface GatewayHealthEvent {
  type: 'event'
  event: 'health'
  payload?: GatewayHealthEventPayload
}

export interface GatewayStatusMessage {
  type: 'gateway-status'
  payload: GatewayStatus
  timestamp: number
}

export interface GatewayResponseMessage {
  type: 'gateway-response'
  payload: string
  timestamp: number
}

export interface GatewayRequestFrame {
  type: 'req'
  id: string
  method: string
  params?: unknown
}

export interface GatewayResponseFrame {
  type: 'res'
  id: string
  ok: boolean
  payload?: unknown
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

export type GatewayIncomingMessage =
  | GatewayConnectChallengeEvent
  | GatewayAssistantStreamEvent
  | GatewayChatFinalEvent
  | GatewayHealthEvent
  | GatewayStatusMessage
  | GatewayResponseMessage
  | GatewayResponseFrame
  | {
      type: string
      event?: string
      payload?: unknown
      [key: string]: unknown
    }

export interface GatewaySendChatRequest {
  type: 'req'
  id: string
  method: 'chat.send'
  params: {
    sessionKey: string
    message: string
    deliver: boolean
    idempotencyKey: string
  }
}

export interface GatewayStatusRequest {
  type: 'get-status'
}

export interface GatewayConnectionState {
  connected: boolean
}

export type GatewayOutgoingMessage =
  | GatewaySendChatRequest
  | GatewayStatusRequest
  | GatewayRequestFrame
  | Record<string, unknown>

export function parseGatewayMessage(raw: string): GatewayIncomingMessage {
  return JSON.parse(raw) as GatewayIncomingMessage
}

export function isGatewayStatusMessage(message: GatewayIncomingMessage): message is GatewayStatusMessage {
  return message.type === 'gateway-status'
}

export function isGatewayResponseMessage(message: GatewayIncomingMessage): message is GatewayResponseMessage {
  return message.type === 'gateway-response' && typeof message.payload === 'string'
}

export function isGatewayResponseFrame(message: GatewayIncomingMessage): message is GatewayResponseFrame {
  return message.type === 'res' && typeof (message as GatewayResponseFrame).id === 'string'
}

export function isGatewayConnectChallengeEvent(
  message: GatewayIncomingMessage
): message is GatewayConnectChallengeEvent {
  return message.type === 'event' && message.event === 'connect.challenge'
}

export function isGatewayAssistantStreamEvent(message: GatewayIncomingMessage): message is GatewayAssistantStreamEvent {
  return message.type === 'event' && message.event === 'agent'
}

export function isGatewayChatFinalEvent(message: GatewayIncomingMessage): message is GatewayChatFinalEvent {
  return message.type === 'event' && message.event === 'chat'
}

export function isGatewayHealthEvent(message: GatewayIncomingMessage): message is GatewayHealthEvent {
  return message.type === 'event' && message.event === 'health'
}

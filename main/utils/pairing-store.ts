import fs from 'fs-extra'
import path from 'path'
import { homedir } from 'os'

type PairingRequest = {
  id: string
  code: string
  accountId?: string
  meta?: {
    accountId?: string
  }
}

type PairingState = {
  version?: number
  requests?: PairingRequest[]
}

type AllowFromState = {
  version?: number
  allowFrom?: string[]
}

function getCredentialsDir() {
  return path.join(homedir(), '.openclaw', 'credentials')
}

function safeChannelKey(channel: string) {
  const raw = channel.trim().toLowerCase()
  if (!raw || !/^[a-z][a-z0-9_-]{0,63}$/.test(raw)) {
    throw new Error('invalid pairing channel')
  }
  return raw
}

function safeAccountKey(accountId: string) {
  const raw = accountId.trim().toLowerCase()
  if (!raw || !/^[a-z0-9][a-z0-9._-]{0,63}$/.test(raw)) {
    throw new Error('invalid pairing account id')
  }
  return raw
}

function resolvePairingPath(channel: string) {
  return path.join(getCredentialsDir(), `${safeChannelKey(channel)}-pairing.json`)
}

function resolveAllowFromPath(channel: string, accountId?: string) {
  const base = safeChannelKey(channel)
  const normalizedAccountId = typeof accountId === 'string' ? accountId.trim() : ''
  if (!normalizedAccountId) {
    return path.join(getCredentialsDir(), `${base}-allowFrom.json`)
  }
  return path.join(getCredentialsDir(), `${base}-${safeAccountKey(normalizedAccountId)}-allowFrom.json`)
}

export async function approvePairingCode(channel: string, rawCode: string) {
  const code = rawCode.trim().toUpperCase()
  if (!code) {
    throw new Error('pairing code is required')
  }

  const pairingPath = resolvePairingPath(channel)
  const pairingState = ((await fs.pathExists(pairingPath))
    ? await fs.readJson(pairingPath).catch(() => ({ version: 1, requests: [] }))
    : { version: 1, requests: [] }) as PairingState

  const requests = Array.isArray(pairingState.requests) ? pairingState.requests : []
  const matchedRequest = requests.find((request) => String(request?.code ?? '').trim().toUpperCase() === code)
  if (!matchedRequest?.id) {
    throw new Error(`No pending pairing request found for code: ${code}`)
  }

  const requestAccountId = typeof matchedRequest.accountId === 'string' && matchedRequest.accountId.trim().length > 0
    ? matchedRequest.accountId.trim()
    : (typeof matchedRequest.meta?.accountId === 'string' && matchedRequest.meta.accountId.trim().length > 0
        ? matchedRequest.meta.accountId.trim()
        : undefined)

  const nextRequests = requests.filter((request) => request !== matchedRequest)
  await fs.outputJson(
    pairingPath,
    {
      version: pairingState.version ?? 1,
      requests: nextRequests,
    },
    { spaces: 2 },
  )

  const allowFromPath = resolveAllowFromPath(channel, requestAccountId)
  const allowFromState = ((await fs.pathExists(allowFromPath))
    ? await fs.readJson(allowFromPath).catch(() => ({ version: 1, allowFrom: [] }))
    : { version: 1, allowFrom: [] }) as AllowFromState

  const currentAllowFrom = Array.isArray(allowFromState.allowFrom)
    ? allowFromState.allowFrom.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : []
  const nextAllowFrom = currentAllowFrom.includes(matchedRequest.id)
    ? currentAllowFrom
    : [...currentAllowFrom, matchedRequest.id]

  await fs.outputJson(
    allowFromPath,
    {
      version: allowFromState.version ?? 1,
      allowFrom: nextAllowFrom,
    },
    { spaces: 2 },
  )

  return {
    id: matchedRequest.id,
    accountId: requestAccountId ?? null,
    channel: safeChannelKey(channel),
  }
}

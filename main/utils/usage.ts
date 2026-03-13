import type { GatewayClient } from '../gateway/client'
import type {
  CostUsageSummary,
  SessionLogEntry,
  SessionUsageTimeSeries,
  UsageDateMode,
  UsageOverviewPayload,
  UsageQueryPayload,
} from '../../shared/usage'

type DateInterpretationMode = 'utc' | 'specific'

type UsageDateInterpretationParams = {
  mode: DateInterpretationMode
  utcOffset?: string
}

const UNSUPPORTED_DATE_PARAM_GATEWAYS = new Set<string>()
const LEGACY_USAGE_DATE_PARAMS_MODE_RE = /unexpected property ['"]mode['"]/i
const LEGACY_USAGE_DATE_PARAMS_OFFSET_RE = /unexpected property ['"]utcoffset['"]/i
const LEGACY_USAGE_DATE_PARAMS_INVALID_RE = /invalid sessions\.usage params/i

function toErrorMessage(err: unknown) {
  if (typeof err === 'string') return err
  if (err instanceof Error && err.message.trim()) return err.message
  try {
    return JSON.stringify(err)
  } catch {
    return 'request failed'
  }
}

function isLegacyDateInterpretationUnsupportedError(err: unknown) {
  const message = toErrorMessage(err)
  return (
    LEGACY_USAGE_DATE_PARAMS_INVALID_RE.test(message) &&
    (LEGACY_USAGE_DATE_PARAMS_MODE_RE.test(message) || LEGACY_USAGE_DATE_PARAMS_OFFSET_RE.test(message))
  )
}

function formatUtcOffset(timezoneOffsetMinutes: number) {
  const offsetFromUtcMinutes = -timezoneOffsetMinutes
  const sign = offsetFromUtcMinutes >= 0 ? '+' : '-'
  const absMinutes = Math.abs(offsetFromUtcMinutes)
  const hours = Math.floor(absMinutes / 60)
  const minutes = absMinutes % 60
  return minutes === 0 ? `UTC${sign}${hours}` : `UTC${sign}${hours}:${String(minutes).padStart(2, '0')}`
}

function buildDateInterpretationParams(
  timeZone: UsageDateMode,
  includeDateInterpretation: boolean
): UsageDateInterpretationParams | undefined {
  if (!includeDateInterpretation) {
    return undefined
  }

  if (timeZone === 'utc') {
    return { mode: 'utc' }
  }

  return {
    mode: 'specific',
    utcOffset: formatUtcOffset(new Date().getTimezoneOffset()),
  }
}

function buildGatewayCompatibilityKey(client: GatewayClient) {
  return (client as unknown as { options?: { wsUrl?: string } }).options?.wsUrl?.trim()?.toLowerCase() || '__default__'
}

export async function getUsageOverview(client: GatewayClient, payload: UsageQueryPayload): Promise<UsageOverviewPayload> {
  const key = buildGatewayCompatibilityKey(client)
  const includeDateInterpretation = !UNSUPPORTED_DATE_PARAM_GATEWAYS.has(key)

  const runRequests = async (withDateInterpretation: boolean) => {
    const dateInterpretation = buildDateInterpretationParams(payload.timeZone ?? 'local', withDateInterpretation)
    const baseParams = {
      startDate: payload.startDate,
      endDate: payload.endDate,
      ...dateInterpretation,
    }

    const [usage, costSummary] = await Promise.all([
      client.request('sessions.usage', {
        ...baseParams,
        limit: 1000,
        includeContextWeight: true,
      }),
      client.request('usage.cost', baseParams),
    ])

    return {
      usage: usage as UsageOverviewPayload['usage'],
      costSummary: costSummary as CostUsageSummary,
    }
  }

  try {
    const result = await runRequests(includeDateInterpretation)
    return {
      ...result,
      startDate: payload.startDate,
      endDate: payload.endDate,
      timeZone: payload.timeZone ?? 'local',
    }
  } catch (err) {
    if (includeDateInterpretation && isLegacyDateInterpretationUnsupportedError(err)) {
      UNSUPPORTED_DATE_PARAM_GATEWAYS.add(key)
      const result = await runRequests(false)
      return {
        ...result,
        startDate: payload.startDate,
        endDate: payload.endDate,
        timeZone: payload.timeZone ?? 'local',
      }
    }

    throw err
  }
}

export async function getUsageTimeSeries(client: GatewayClient, payload?: { key?: string }) {
  const key = payload?.key?.trim()
  if (!key) {
    throw new Error('key is required')
  }

  return client.request('sessions.usage.timeseries', { key }) as Promise<SessionUsageTimeSeries>
}

export async function getUsageLogs(client: GatewayClient, payload?: { key?: string; limit?: number }) {
  const key = payload?.key?.trim()
  if (!key) {
    throw new Error('key is required')
  }

  const response = await client.request('sessions.usage.logs', {
    key,
    limit: payload?.limit ?? 1000,
  })

  return response as { logs: SessionLogEntry[] }
}


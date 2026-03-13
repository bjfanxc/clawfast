import type { GatewayClient } from '../gateway/client'
import type {
  CronDraft,
  CronJobsListResult,
  CronModelsList,
  CronRunMode,
  CronSnapshot,
  CronStatus,
} from '../../shared/cron'

async function listCronJobs(client: GatewayClient): Promise<CronJobsListResult> {
  return client.request<CronJobsListResult>('cron.list', {
    includeDisabled: true,
    limit: 120,
    offset: 0,
    sortBy: 'nextRunAtMs',
    sortDir: 'asc',
  })
}

async function loadCronStatus(client: GatewayClient): Promise<CronStatus | null> {
  try {
    return await client.request<CronStatus>('cron.status', {})
  } catch {
    return null
  }
}

async function loadCronModels(client: GatewayClient): Promise<string[]> {
  try {
    const response = await client.request<CronModelsList>('models.list', {})
    const models = Array.isArray(response.models) ? response.models : []
    return Array.from(
      new Set(
        models
          .map((entry) => (typeof entry?.id === 'string' ? entry.id.trim() : ''))
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b))
  } catch {
    return []
  }
}

export async function getCronSnapshot(client: GatewayClient): Promise<CronSnapshot> {
  const [status, jobsResult, modelSuggestions] = await Promise.all([
    loadCronStatus(client),
    listCronJobs(client),
    loadCronModels(client),
  ])

  const jobs = Array.isArray(jobsResult.jobs) ? jobsResult.jobs : []

  return {
    status,
    jobs,
    total: typeof jobsResult.total === 'number' ? jobsResult.total : jobs.length,
    hasMore: Boolean(jobsResult.hasMore),
    nextOffset: typeof jobsResult.nextOffset === 'number' ? jobsResult.nextOffset : null,
    modelSuggestions,
  }
}

export async function saveCronJob(client: GatewayClient, draft: CronDraft): Promise<CronSnapshot> {
  const payload = {
    name: draft.name.trim(),
    description: draft.description?.trim() || undefined,
    enabled: draft.enabled,
    deleteAfterRun: draft.deleteAfterRun ?? false,
    agentId: draft.agentId?.trim() || undefined,
    sessionKey: draft.sessionKey?.trim() || undefined,
    schedule: draft.schedule,
    sessionTarget: draft.sessionTarget,
    wakeMode: draft.wakeMode,
    payload: draft.payload,
    delivery: draft.delivery,
  }

  if (draft.id?.trim()) {
    await client.request('cron.update', {
      id: draft.id.trim(),
      patch: payload,
    })
  } else {
    await client.request('cron.add', payload)
  }

  return getCronSnapshot(client)
}

export async function toggleCronJob(
  client: GatewayClient,
  payload: { id: string; enabled: boolean }
): Promise<CronSnapshot> {
  await client.request('cron.update', {
    id: payload.id,
    patch: { enabled: payload.enabled },
  })

  return getCronSnapshot(client)
}

export async function runCronJob(
  client: GatewayClient,
  payload: { id: string; mode?: CronRunMode }
): Promise<CronSnapshot> {
  await client.request('cron.run', {
    id: payload.id,
    mode: payload.mode ?? 'force',
  })

  return getCronSnapshot(client)
}

export async function removeCronJob(client: GatewayClient, payload: { id: string }): Promise<CronSnapshot> {
  await client.request('cron.remove', { id: payload.id })
  return getCronSnapshot(client)
}

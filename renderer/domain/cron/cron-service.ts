import type { CronDraft, CronRunMode, CronSnapshot } from '../../../shared/cron'
import { getOfflineCronSnapshot, isGatewayConnected } from '@/domain/gateway/gateway-guard'
import { getIpcNamespace } from '@/domain/ipc/ipc-client'

export async function loadCronSnapshot(): Promise<CronSnapshot> {
  const cron = getIpcNamespace('cron', 'Cron API is not available')

  if (!(await isGatewayConnected())) {
    return getOfflineCronSnapshot()
  }

  return cron.snapshot()
}

export async function saveCronDraft(payload: CronDraft): Promise<CronSnapshot> {
  const cron = getIpcNamespace('cron', 'Cron API is not available')
  return cron.save(payload)
}

export async function setCronJobEnabled(id: string, enabled: boolean): Promise<CronSnapshot> {
  const cron = getIpcNamespace('cron', 'Cron API is not available')
  return cron.toggle(id, enabled)
}

export async function runCronNow(id: string, mode: CronRunMode = 'force'): Promise<CronSnapshot> {
  const cron = getIpcNamespace('cron', 'Cron API is not available')
  return cron.run(id, mode)
}

export async function deleteCronJob(id: string): Promise<CronSnapshot> {
  const cron = getIpcNamespace('cron', 'Cron API is not available')
  return cron.remove(id)
}

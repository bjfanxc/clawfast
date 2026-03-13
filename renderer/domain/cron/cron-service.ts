import type { CronDraft, CronRunMode, CronSnapshot } from '../../../shared/cron'
import { getOfflineCronSnapshot, isGatewayConnected } from '@/domain/gateway/gateway-guard'

export async function loadCronSnapshot(): Promise<CronSnapshot> {
  if (!window.ipc?.cron) {
    throw new Error('Cron API is not available')
  }

  if (!(await isGatewayConnected())) {
    return getOfflineCronSnapshot()
  }

  return window.ipc.cron.snapshot()
}

export async function saveCronDraft(payload: CronDraft): Promise<CronSnapshot> {
  if (!window.ipc?.cron) {
    throw new Error('Cron API is not available')
  }

  return window.ipc.cron.save(payload)
}

export async function setCronJobEnabled(id: string, enabled: boolean): Promise<CronSnapshot> {
  if (!window.ipc?.cron) {
    throw new Error('Cron API is not available')
  }

  return window.ipc.cron.toggle(id, enabled)
}

export async function runCronNow(id: string, mode: CronRunMode = 'force'): Promise<CronSnapshot> {
  if (!window.ipc?.cron) {
    throw new Error('Cron API is not available')
  }

  return window.ipc.cron.run(id, mode)
}

export async function deleteCronJob(id: string): Promise<CronSnapshot> {
  if (!window.ipc?.cron) {
    throw new Error('Cron API is not available')
  }

  return window.ipc.cron.remove(id)
}

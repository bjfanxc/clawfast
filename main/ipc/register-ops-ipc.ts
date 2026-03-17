import { ipcMain } from 'electron'
import { listChannels } from '../utils/channels'
import { getCronSnapshot, removeCronJob, runCronJob, saveCronJob, toggleCronJob } from '../utils/cron'
import { deleteSession, listSessions, patchSession } from '../utils/sessions'
import { IPC_CHANNELS } from '../../shared/ipc'
import type { ListChannelsOptions } from '../../shared/channels'
import type { CronDraft, CronRunMode } from '../../shared/cron'
import type { IpcRegistrationContext } from './types'

export function registerOpsIpc({ gatewayClient }: IpcRegistrationContext) {
  ipcMain.handle(IPC_CHANNELS.channels.list, async (_event, payload?: ListChannelsOptions) => {
    return listChannels(gatewayClient, payload)
  })

  ipcMain.handle(IPC_CHANNELS.cron.snapshot, async () => {
    return getCronSnapshot(gatewayClient)
  })

  ipcMain.handle(IPC_CHANNELS.cron.save, async (_event, payload?: CronDraft) => {
    if (!payload?.name?.trim()) {
      throw new Error('name is required')
    }
    return saveCronJob(gatewayClient, payload)
  })

  ipcMain.handle(IPC_CHANNELS.cron.toggle, async (_event, payload?: { id?: string; enabled?: boolean }) => {
    const id = payload?.id?.trim()
    if (!id) {
      throw new Error('id is required')
    }
    return toggleCronJob(gatewayClient, {
      id,
      enabled: Boolean(payload?.enabled),
    })
  })

  ipcMain.handle(IPC_CHANNELS.cron.run, async (_event, payload?: { id?: string; mode?: CronRunMode }) => {
    const id = payload?.id?.trim()
    if (!id) {
      throw new Error('id is required')
    }
    return runCronJob(gatewayClient, {
      id,
      mode: payload?.mode,
    })
  })

  ipcMain.handle(IPC_CHANNELS.cron.remove, async (_event, payload?: { id?: string }) => {
    const id = payload?.id?.trim()
    if (!id) {
      throw new Error('id is required')
    }
    return removeCronJob(gatewayClient, { id })
  })

  ipcMain.handle(IPC_CHANNELS.sessions.list, async () => {
    return listSessions(gatewayClient)
  })

  ipcMain.handle(
    IPC_CHANNELS.sessions.patch,
    async (
      _event,
      payload?: {
        key?: string
        label?: string | null
        thinkingLevel?: string | null
        verboseLevel?: string | null
        reasoningLevel?: string | null
      }
    ) => {
      const key = payload?.key?.trim()
      if (!key) {
        throw new Error('key is required')
      }
      return patchSession(gatewayClient, {
        key,
        label: payload?.label ?? null,
        thinkingLevel: payload?.thinkingLevel ?? null,
        verboseLevel: payload?.verboseLevel ?? null,
        reasoningLevel: payload?.reasoningLevel ?? null,
      })
    }
  )

  ipcMain.handle(IPC_CHANNELS.sessions.delete, async (_event, payload?: { key?: string; deleteTranscript?: boolean }) => {
    const key = payload?.key?.trim()
    if (!key) {
      throw new Error('key is required')
    }
    return deleteSession(gatewayClient, {
      key,
      deleteTranscript: payload?.deleteTranscript ?? true,
    })
  })
}

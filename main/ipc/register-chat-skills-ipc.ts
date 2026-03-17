import { ipcMain } from 'electron'
import { getChatHistory } from '../utils/chat'
import { installSkill, listSkills, openSkillsFolder, updateSkill } from '../utils/skills'
import { IPC_CHANNELS } from '../../shared/ipc'
import type { ListSkillsOptions, UpdateSkillPayload, InstallSkillPayload } from '../../shared/skills'
import type { IpcRegistrationContext } from './types'

export function registerChatSkillsIpc({ gatewayClient }: IpcRegistrationContext) {
  ipcMain.handle(IPC_CHANNELS.chat.history, async (_event, payload?: { sessionKey?: string }) => {
    const sessionKey = payload?.sessionKey?.trim()
    if (!sessionKey) {
      throw new Error('sessionKey is required')
    }
    return getChatHistory(gatewayClient, sessionKey)
  })

  ipcMain.handle(IPC_CHANNELS.skills.list, async (_event, payload?: ListSkillsOptions) => {
    return listSkills(gatewayClient, payload)
  })

  ipcMain.handle(
    IPC_CHANNELS.skills.setEnabled,
    async (_event, payload: { skillKey?: string; enabled?: boolean; agentId?: string | null }) => {
      const skillKey = payload?.skillKey?.trim()
      if (!skillKey) {
        throw new Error('skillKey is required')
      }
      return updateSkill(gatewayClient, {
        skillKey,
        enabled: Boolean(payload?.enabled),
        agentId: payload?.agentId ?? null,
      })
    }
  )

  ipcMain.handle(IPC_CHANNELS.skills.update, async (_event, payload: UpdateSkillPayload) => {
    return updateSkill(gatewayClient, payload)
  })

  ipcMain.handle(IPC_CHANNELS.skills.install, async (_event, payload: InstallSkillPayload) => {
    return installSkill(gatewayClient, payload)
  })

  ipcMain.handle(IPC_CHANNELS.skills.openFolder, async (_event, payload?: ListSkillsOptions) => {
    return openSkillsFolder(gatewayClient, payload)
  })
}

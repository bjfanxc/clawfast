import type { InstallSkillPayload, SkillsSnapshot, UpdateSkillPayload } from '../../../shared/skills'
import { getOfflineSkillsSnapshot, isGatewayConnected } from '@/domain/gateway/gateway-guard'

export async function loadSkillsSnapshot(agentId?: string | null): Promise<SkillsSnapshot> {
  if (!window.ipc?.skills) {
    throw new Error('Skills API is not available')
  }

  if (!(await isGatewayConnected())) {
    return getOfflineSkillsSnapshot()
  }

  return window.ipc.skills.list(agentId ?? null)
}

export async function setSkillEnabled(skillKey: string, enabled: boolean, agentId?: string | null) {
  if (!window.ipc?.skills) {
    throw new Error('Skills API is not available')
  }

  return window.ipc.skills.setEnabled(skillKey, enabled, agentId ?? null)
}

export async function updateSkill(payload: UpdateSkillPayload) {
  if (!window.ipc?.skills) {
    throw new Error('Skills API is not available')
  }

  return window.ipc.skills.update(payload)
}

export async function installSkill(payload: InstallSkillPayload) {
  if (!window.ipc?.skills) {
    throw new Error('Skills API is not available')
  }

  return window.ipc.skills.install(payload)
}

export async function openSkillsFolder(agentId?: string | null) {
  if (!window.ipc?.skills) {
    throw new Error('Skills API is not available')
  }

  return window.ipc.skills.openFolder(agentId ?? null)
}

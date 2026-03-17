import type { InstallSkillPayload, SkillsSnapshot, UpdateSkillPayload } from '../../../shared/skills'
import { getOfflineSkillsSnapshot, isGatewayConnected } from '@/domain/gateway/gateway-guard'
import { getIpcNamespace } from '@/domain/ipc/ipc-client'

export async function loadSkillsSnapshot(agentId?: string | null): Promise<SkillsSnapshot> {
  const skills = getIpcNamespace('skills', 'Skills API is not available')

  if (!(await isGatewayConnected())) {
    return getOfflineSkillsSnapshot()
  }

  return skills.list(agentId ?? null)
}

export async function setSkillEnabled(skillKey: string, enabled: boolean, agentId?: string | null) {
  const skills = getIpcNamespace('skills', 'Skills API is not available')
  return skills.setEnabled(skillKey, enabled, agentId ?? null)
}

export async function updateSkill(payload: UpdateSkillPayload) {
  const skills = getIpcNamespace('skills', 'Skills API is not available')
  return skills.update(payload)
}

export async function installSkill(payload: InstallSkillPayload) {
  const skills = getIpcNamespace('skills', 'Skills API is not available')
  return skills.install(payload)
}

export async function openSkillsFolder(agentId?: string | null) {
  const skills = getIpcNamespace('skills', 'Skills API is not available')
  return skills.openFolder(agentId ?? null)
}

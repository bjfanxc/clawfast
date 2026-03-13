export type SkillSourceType = 'built-in' | 'market'

export interface SkillsStatusConfigCheck {
  path: string
  satisfied: boolean
}

export interface SkillInstallOption {
  id: string
  kind: 'brew' | 'node' | 'go' | 'uv'
  label: string
  bins: string[]
}

export interface SkillRequirements {
  bins: string[]
  env: string[]
  config: string[]
  os: string[]
}

export interface SkillMissingRequirements {
  bins: string[]
  env: string[]
  config: string[]
  os: string[]
}

export interface SkillStatusEntry {
  name: string
  description: string
  source: string
  filePath: string
  baseDir: string
  skillKey: string
  bundled?: boolean
  primaryEnv?: string
  emoji?: string
  homepage?: string
  always: boolean
  disabled: boolean
  blockedByAllowlist: boolean
  eligible: boolean
  requirements: SkillRequirements
  missing: SkillMissingRequirements
  configChecks: SkillsStatusConfigCheck[]
  install: SkillInstallOption[]
}

export interface SkillStatusReport {
  workspaceDir: string
  managedSkillsDir: string
  skills: SkillStatusEntry[]
}

export interface SkillItem extends SkillStatusEntry {
  version: string | null
  sourceType: SkillSourceType
  sourceLabel: string
  enabled: boolean
}

export interface SkillsSnapshot {
  skillsDir: string
  workspaceDir: string | null
  managedSkillsDir: string | null
  agentId: string | null
  skills: SkillItem[]
  report: SkillStatusReport | null
}

export interface OpenSkillsFolderResult {
  ok: boolean
  path: string
  error: string | null
}

export interface ListSkillsOptions {
  agentId?: string | null
}

export interface UpdateSkillPayload extends ListSkillsOptions {
  skillKey: string
  enabled?: boolean
  apiKey?: string
}

export interface InstallSkillPayload extends ListSkillsOptions {
  skillKey?: string
  name: string
  installId: string
  timeoutMs?: number
}

import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import { shell } from 'electron'

import type { GatewayClient } from '../gateway/client'
import type {
  InstallSkillPayload,
  ListSkillsOptions,
  OpenSkillsFolderResult,
  SkillItem,
  SkillStatusEntry,
  SkillStatusReport,
  SkillsSnapshot,
  UpdateSkillPayload,
} from '../../shared/skills'

function getCodexHome() {
  return process.env.CODEX_HOME?.trim() || path.join(os.homedir(), '.codex')
}

export function getSkillsDir() {
  return path.join(getCodexHome(), 'skills')
}

function stripQuotes(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, '')
}

function readFrontmatterValue(frontmatter: string, key: string) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = frontmatter.match(new RegExp(`(?:^|\\n)\\s*${escapedKey}:\\s*(.+)`))
  return match ? stripQuotes(match[1]) : null
}

function extractFrontmatter(raw: string) {
  const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/)
  return match ? match[1] : ''
}

async function readSkillFrontmatter(skillFilePath: string) {
  try {
    const raw = await fs.readFile(skillFilePath, 'utf8')
    const frontmatter = extractFrontmatter(raw)
    return {
      version: readFrontmatterValue(frontmatter, 'version') || readFrontmatterValue(frontmatter, 'metadata.version'),
      homepage: readFrontmatterValue(frontmatter, 'homepage'),
      emoji: readFrontmatterValue(frontmatter, 'emoji'),
    }
  } catch {
    return {
      version: null,
      homepage: null,
      emoji: null,
    }
  }
}

function getSourceMeta(skill: SkillStatusEntry) {
  if (skill.bundled === true) {
    return {
      sourceType: 'built-in' as const,
      sourceLabel: 'Built-in',
    }
  }

  if (skill.source === 'openclaw-workspace') {
    return {
      sourceType: 'market' as const,
      sourceLabel: 'Workspace',
    }
  }

  if (skill.source === 'openclaw-managed') {
    return {
      sourceType: 'market' as const,
      sourceLabel: 'Installed',
    }
  }

  if (skill.source === 'openclaw-extra') {
    return {
      sourceType: 'market' as const,
      sourceLabel: 'Extra',
    }
  }

  return {
    sourceType: 'market' as const,
    sourceLabel: skill.source || 'Marketplace',
  }
}

async function toSkillItem(skill: SkillStatusEntry): Promise<SkillItem> {
  const meta = getSourceMeta(skill)
  const frontmatter = await readSkillFrontmatter(skill.filePath)

  return {
    ...skill,
    version: frontmatter.version,
    homepage: skill.homepage || frontmatter.homepage,
    emoji: skill.emoji || frontmatter.emoji,
    sourceType: meta.sourceType,
    sourceLabel: meta.sourceLabel,
    enabled: !skill.disabled,
  }
}

async function mapReportToSnapshot(report: SkillStatusReport, agentId?: string | null): Promise<SkillsSnapshot> {
  const skills = await Promise.all(report.skills.map((skill) => toSkillItem(skill)))

  skills.sort((left, right) => {
    if (left.sourceType !== right.sourceType) {
      return left.sourceType === 'built-in' ? -1 : 1
    }
    return left.name.localeCompare(right.name)
  })

  return {
    skillsDir: report.managedSkillsDir || getSkillsDir(),
    workspaceDir: report.workspaceDir || null,
    managedSkillsDir: report.managedSkillsDir || null,
    agentId: agentId?.trim() || null,
    skills,
    report,
  }
}

async function requestSkillsReport(client: GatewayClient, agentId?: string | null) {
  const params = agentId?.trim() ? { agentId: agentId.trim() } : {}
  return client.request<SkillStatusReport>('skills.status', params)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForSkillEnabledState(
  client: GatewayClient,
  skillKey: string,
  enabled: boolean,
  agentId?: string | null,
) {
  const timeoutMs = 4_000
  const intervalMs = 250
  const deadline = Date.now() + timeoutMs
  let latestReport = await requestSkillsReport(client, agentId)

  while (Date.now() < deadline) {
    const entry = latestReport.skills.find((skill) => skill.skillKey === skillKey)
    if (entry && entry.disabled === !enabled) {
      return latestReport
    }

    await sleep(intervalMs)
    latestReport = await requestSkillsReport(client, agentId)
  }

  return latestReport
}

export async function listSkills(client: GatewayClient, options?: ListSkillsOptions): Promise<SkillsSnapshot> {
  const report = await requestSkillsReport(client, options?.agentId)
  return mapReportToSnapshot(report, options?.agentId)
}

export async function updateSkill(client: GatewayClient, payload: UpdateSkillPayload) {
  const skillKey = payload.skillKey?.trim()
  if (!skillKey) {
    throw new Error('skillKey is required')
  }

  const params: Record<string, unknown> = { skillKey }
  if (typeof payload.enabled === 'boolean') {
    params.enabled = payload.enabled
  }
  if (typeof payload.apiKey === 'string') {
    params.apiKey = payload.apiKey
  }
  if (payload.agentId?.trim()) {
    params.agentId = payload.agentId.trim()
  }

  await client.request('skills.update', params)

  if (typeof payload.enabled === 'boolean') {
    const report = await waitForSkillEnabledState(client, skillKey, payload.enabled, payload.agentId)
    return mapReportToSnapshot(report, payload.agentId)
  }

  return listSkills(client, { agentId: payload.agentId })
}

export async function installSkill(client: GatewayClient, payload: InstallSkillPayload) {
  const name = payload.name?.trim()
  const installId = payload.installId?.trim()

  if (!name) {
    throw new Error('name is required')
  }
  if (!installId) {
    throw new Error('installId is required')
  }

  const params: Record<string, unknown> = {
    name,
    installId,
    timeoutMs: payload.timeoutMs ?? 120_000,
  }

  if (payload.skillKey?.trim()) {
    params.skillKey = payload.skillKey.trim()
  }
  if (payload.agentId?.trim()) {
    params.agentId = payload.agentId.trim()
  }

  await client.request('skills.install', params, Math.max(payload.timeoutMs ?? 120_000, 15_000))
  return listSkills(client, { agentId: payload.agentId })
}

export async function openSkillsFolder(client: GatewayClient, options?: ListSkillsOptions): Promise<OpenSkillsFolderResult> {
  let targetPath = getSkillsDir()

  try {
    const report = await requestSkillsReport(client, options?.agentId)
    targetPath = report.managedSkillsDir || report.workspaceDir || targetPath
  } catch {
    // Fallback to the local codex skills directory when gateway status is unavailable.
  }

  await fs.ensureDir(targetPath)
  const result = await shell.openPath(targetPath)

  return {
    ok: result === '',
    path: targetPath,
    error: result || null,
  }
}

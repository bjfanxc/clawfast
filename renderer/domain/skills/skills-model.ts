import type { SkillItem, SkillSourceType, SkillsSnapshot } from '../../../shared/skills'

export type SkillsScopeFilter = 'installed' | 'market'
export type SkillsSourceFilter = 'all' | SkillSourceType
export type SkillAvailability = 'enabled' | 'disabled' | 'incomplete'

export interface SkillCardModel extends SkillItem {
  availability: SkillAvailability
  issues: string[]
  canInstall: boolean
  installLabel: string | null
}

function getSkillIssues(skill: SkillItem) {
  const issues: string[] = []

  if (!skill.description || skill.description === 'No description provided.') {
    issues.push('missing-description')
  }

  if (!skill.homepage && skill.sourceType === 'market') {
    issues.push('missing-homepage')
  }

  if (!skill.enabled) {
    issues.push('disabled')
  }

  if (skill.missing.bins.length > 0) {
    issues.push(...skill.missing.bins.map((bin) => `missing-bin:${bin}`))
  }

  if (skill.missing.env.length > 0) {
    issues.push(...skill.missing.env.map((env) => `missing-env:${env}`))
  }

  if (skill.missing.config.length > 0) {
    issues.push(...skill.missing.config.map((config) => `missing-config:${config}`))
  }

  if (skill.missing.os.length > 0) {
    issues.push(...skill.missing.os.map((targetOs) => `missing-os:${targetOs}`))
  }

  if (skill.blockedByAllowlist) {
    issues.push('blocked-allowlist')
  }

  return issues
}

function toSkillCardModel(skill: SkillItem): SkillCardModel {
  const issues = getSkillIssues(skill)
  const availability: SkillAvailability = !skill.enabled
    ? 'disabled'
    : issues.some((issue) => issue !== 'disabled')
      ? 'incomplete'
      : 'enabled'

  return {
    ...skill,
    availability,
    issues,
    canInstall: skill.install.length > 0 && skill.missing.bins.length > 0,
    installLabel: skill.install[0]?.label ?? null,
  }
}

export function getScopedSkills(skills: SkillItem[], scope: SkillsScopeFilter) {
  return scope === 'installed'
    ? skills
    : skills.filter((skill) => skill.sourceType === 'market')
}

export function filterSkills(skills: SkillItem[], query: string, sourceFilter: SkillsSourceFilter) {
  const normalizedQuery = query.trim().toLowerCase()

  return skills.filter((skill) => {
    if (sourceFilter !== 'all' && skill.sourceType !== sourceFilter) {
      return false
    }

    if (!normalizedQuery) {
      return true
    }

    const haystack = [skill.name, skill.description, skill.sourceLabel, skill.skillKey]
      .join(' ')
      .toLowerCase()

    return haystack.includes(normalizedQuery)
  })
}

export function getSkillsCounts(skills: SkillItem[]) {
  return {
    all: skills.length,
    'built-in': skills.filter((skill) => skill.sourceType === 'built-in').length,
    market: skills.filter((skill) => skill.sourceType === 'market').length,
  }
}

export function getSkillsViewModel(
  snapshot: SkillsSnapshot | null,
  scope: SkillsScopeFilter,
  query: string,
  sourceFilter: SkillsSourceFilter,
) {
  const allSkills = (snapshot?.skills ?? []).map(toSkillCardModel)
  const scopedSkills = getScopedSkills(allSkills, scope)
  const filteredSkills = filterSkills(scopedSkills, query, sourceFilter)

  return {
    allSkills,
    scopedSkills,
    filteredSkills,
    installedSkills: allSkills,
    marketSkills: allSkills.filter((skill) => skill.sourceType === 'market'),
    counts: getSkillsCounts(scopedSkills),
  }
}

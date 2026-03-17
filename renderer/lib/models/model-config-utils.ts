import JSON5 from 'json5'
import {
  getModelProviderTemplate,
  inferModelProviderType,
  normalizeProviderApiKey,
  type ModelProviderType,
} from '@/lib/models/model-provider-registry'
import type { ProviderDraft, ProviderFormErrors, RouteDraft, RouteFormErrors, TranslationFn } from '@/lib/models/model-config-types'

export function parseJson(raw: string) {
  try {
    const parsed = JSON5.parse(raw) as Record<string, unknown>
    return { ok: true as const, value: parsed }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : String(error) }
  }
}

export function stringifyConfig(value: Record<string, unknown>) {
  return JSON5.stringify(value, null, 2)
}

function getPathValue(obj: Record<string, unknown>, path: string[]) {
  let cursor: unknown = obj
  for (const key of path) {
    if (!cursor || typeof cursor !== 'object') {
      return undefined
    }
    cursor = (cursor as Record<string, unknown>)[key]
  }
  return cursor
}

function setPathValue(obj: Record<string, unknown>, path: string[], value: unknown) {
  let cursor: Record<string, unknown> = obj
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index]
    const next = cursor[key]
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      cursor[key] = {}
    }
    cursor = cursor[key] as Record<string, unknown>
  }
  cursor[path[path.length - 1]] = value
}

function removePathValue(obj: Record<string, unknown>, path: string[]) {
  let cursor: Record<string, unknown> = obj
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index]
    if (!cursor[key] || typeof cursor[key] !== 'object' || Array.isArray(cursor[key])) {
      return
    }
    cursor = cursor[key] as Record<string, unknown>
  }
  delete cursor[path[path.length - 1]]
}

export function toUniqueLines(input: string) {
  return Array.from(
    new Set(
      input
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  )
}

export function prefixModelId(providerId: string, modelId: string) {
  const normalizedProviderId = providerId.trim()
  const normalizedModelId = modelId.trim()

  if (!normalizedModelId) {
    return ''
  }

  if (!normalizedProviderId) {
    return normalizedModelId
  }

  if (normalizedModelId.startsWith(`${normalizedProviderId}/`)) {
    return normalizedModelId
  }

  return `${normalizedProviderId}/${normalizedModelId}`
}

function stripProviderPrefix(providerId: string, modelId: string) {
  const normalizedProviderId = providerId.trim()
  if (!normalizedProviderId) {
    return modelId
  }

  const prefix = `${normalizedProviderId}/`
  return modelId.startsWith(prefix) ? modelId.slice(prefix.length) : modelId
}

export function buildNextProviderId(type: ModelProviderType, drafts: ProviderDraft[]) {
  const template = getModelProviderTemplate(type)
  const prefix = template?.defaultIdPrefix ?? 'provider'
  const taken = new Set(drafts.map((entry) => entry.id.trim()))

  if (!taken.has(prefix)) {
    return prefix
  }

  let index = 2
  while (taken.has(`${prefix}-${index}`)) {
    index += 1
  }

  return `${prefix}-${index}`
}

export function buildProviderDrafts(config: Record<string, unknown> | null): ProviderDraft[] {
  const providers = (config ? getPathValue(config, ['models', 'providers']) : undefined) as Record<string, unknown> | undefined
  if (!providers || typeof providers !== 'object') {
    return []
  }

  return Object.entries(providers)
    .map(([id, value]) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null
      }

      const providerEntry = value as Record<string, unknown>
      const type = inferModelProviderType(id, {
        baseUrl: typeof providerEntry.baseUrl === 'string' ? providerEntry.baseUrl : '',
        api: typeof providerEntry.api === 'string' ? providerEntry.api : '',
      })

      const models = Array.isArray(providerEntry.models)
        ? (providerEntry.models as Array<Record<string, unknown>>)
            .map((entry) => (typeof entry?.id === 'string' ? entry.id : ''))
            .filter(Boolean)
            .join('\n')
        : ''

      return {
        id,
        type,
        baseUrl: typeof providerEntry.baseUrl === 'string' ? providerEntry.baseUrl : '',
        api: typeof providerEntry.api === 'string' ? providerEntry.api : getModelProviderTemplate(type)?.defaultApi ?? '',
        models,
        apiKey: typeof providerEntry.apiKey === 'string' ? providerEntry.apiKey : '',
      }
    })
    .filter(Boolean) as ProviderDraft[]
}

export function buildRouteDraft(config: Record<string, unknown> | null, providerIds: string[]): RouteDraft {
  const modelConfig = (config ? getPathValue(config, ['agents', 'defaults', 'model']) : undefined) as Record<string, unknown> | undefined
  const primaryRaw = typeof modelConfig?.primary === 'string' ? modelConfig.primary : ''
  const fallbacksRaw = Array.isArray(modelConfig?.fallbacks)
    ? (modelConfig.fallbacks as unknown[]).filter((item) => typeof item === 'string') as string[]
    : []

  let defaultProviderId = ''
  let primaryModel = primaryRaw

  if (primaryRaw.includes('/')) {
    const [prefix, ...rest] = primaryRaw.split('/')
    if (providerIds.includes(prefix)) {
      defaultProviderId = prefix
      primaryModel = rest.join('/')
    }
  }

  const fallbackModels = fallbacksRaw
    .map((modelId) => (defaultProviderId ? stripProviderPrefix(defaultProviderId, modelId) : modelId))
    .filter(Boolean)

  return {
    primaryModel,
    defaultProviderId,
    fallbackModels,
  }
}

export function mergeProviderConfig(base: Record<string, unknown>, drafts: ProviderDraft[]) {
  const existingProviders = (getPathValue(base, ['models', 'providers']) ?? {}) as Record<string, unknown>
  const nextProviders: Record<string, unknown> = {}

  drafts.forEach((draft) => {
    const id = draft.id.trim()
    if (!id) {
      return
    }

    const current = existingProviders[id]
    const providerEntry =
      current && typeof current === 'object' && !Array.isArray(current)
        ? { ...(current as Record<string, unknown>) }
        : {}

    const baseUrl = draft.baseUrl.trim()
    const api = draft.api.trim()
    const apiKey = normalizeProviderApiKey(draft.type, draft.apiKey)
    const models = toUniqueLines(draft.models).map((modelId) => ({ id: modelId, name: modelId }))

    if (baseUrl) {
      providerEntry.baseUrl = baseUrl
    } else {
      delete providerEntry.baseUrl
    }

    if (api) {
      providerEntry.api = api
    } else {
      delete providerEntry.api
    }

    if (apiKey) {
      providerEntry.apiKey = apiKey
    } else {
      delete providerEntry.apiKey
    }

    if (models.length > 0) {
      providerEntry.models = models
    } else {
      delete providerEntry.models
    }

    nextProviders[id] = providerEntry
  })

  if (Object.keys(nextProviders).length > 0) {
    setPathValue(base, ['models', 'providers'], nextProviders)
  } else {
    removePathValue(base, ['models', 'providers'])
  }
}

export function mergeRouteConfig(base: Record<string, unknown>, route: RouteDraft) {
  const primary = prefixModelId(route.defaultProviderId, route.primaryModel)
  const fallbacks = route.fallbackModels.map((item) => prefixModelId(route.defaultProviderId, item)).filter(Boolean)

  if (primary) {
    setPathValue(base, ['agents', 'defaults', 'model', 'primary'], primary)
  } else {
    removePathValue(base, ['agents', 'defaults', 'model', 'primary'])
  }

  if (fallbacks.length > 0) {
    setPathValue(base, ['agents', 'defaults', 'model', 'fallbacks'], fallbacks)
  } else {
    removePathValue(base, ['agents', 'defaults', 'model', 'fallbacks'])
  }
}

export function getProviderModels(provider: ProviderDraft | undefined) {
  return toUniqueLines(provider?.models ?? '')
}

export function resolveRouteProviderId(route: RouteDraft, providers: ProviderDraft[]) {
  const explicitProviderId = route.defaultProviderId.trim()
  if (explicitProviderId) {
    return explicitProviderId
  }

  const primaryModel = route.primaryModel.trim()
  if (primaryModel.includes('/')) {
    const [providerId] = primaryModel.split('/')
    if (providers.some((entry) => entry.id.trim() === providerId)) {
      return providerId
    }
  }

  const matchingProviders = providers.filter((entry) => getProviderModels(entry).includes(primaryModel))
  if (matchingProviders.length === 1) {
    return matchingProviders[0].id.trim()
  }

  return ''
}

export function sanitizeRouteDraft(route: RouteDraft, providers: ProviderDraft[]) {
  const providerId = resolveRouteProviderId(route, providers)
  const nextRoute: RouteDraft = {
    primaryModel: route.primaryModel.trim(),
    defaultProviderId: providerId,
    fallbackModels: Array.from(new Set(route.fallbackModels.map((item) => item.trim()).filter(Boolean))),
  }

  const provider = providers.find((entry) => entry.id.trim() === nextRoute.defaultProviderId)
  if (!provider) {
    return {
      route: { primaryModel: '', defaultProviderId: '', fallbackModels: [] },
      changed: Boolean(nextRoute.defaultProviderId || nextRoute.primaryModel || nextRoute.fallbackModels.length),
    }
  }

  const availableModels = getProviderModels(provider)
  const primaryExists = availableModels.includes(nextRoute.primaryModel)
  const primaryModel = primaryExists ? nextRoute.primaryModel : ''
  const fallbackModels = primaryModel
    ? nextRoute.fallbackModels.filter((item) => item !== primaryModel && availableModels.includes(item))
    : []

  const sanitized = {
    defaultProviderId: nextRoute.defaultProviderId,
    primaryModel,
    fallbackModels,
  }

  const changed =
    sanitized.defaultProviderId !== route.defaultProviderId ||
    sanitized.primaryModel !== route.primaryModel ||
    sanitized.fallbackModels.join('\n') !== route.fallbackModels.join('\n')

  return { route: sanitized, changed }
}

export function validateProviderDraft(
  draft: ProviderDraft,
  providerIds: string[],
  t: TranslationFn,
): ProviderFormErrors {
  const errors: ProviderFormErrors = {}
  const template = getModelProviderTemplate(draft.type)
  const id = draft.id.trim()

  if (!id) {
    errors.id = t('models.errors.providerIdRequired')
  } else if (!/^[a-z0-9][a-z0-9-_]*$/i.test(id)) {
    errors.id = t('models.errors.providerIdInvalid')
  } else if (providerIds.filter((entry) => entry === id).length > 1) {
    errors.id = t('models.errors.duplicateProviderIds', { ids: id })
  }

  const baseUrl = draft.baseUrl.trim()
  if (!baseUrl) {
    errors.baseUrl = t('models.errors.providerBaseUrlRequired')
  } else {
    try {
      const url = new URL(baseUrl)
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.baseUrl = t('models.errors.invalidBaseUrlProtocol', { id: id || (template?.label ?? 'provider') })
      }
    } catch {
      errors.baseUrl = t('models.errors.invalidBaseUrl', { id: id || (template?.label ?? 'provider') })
    }
  }

  if (draft.type === 'custom' && !draft.api.trim()) {
    errors.api = t('models.errors.providerApiRequired')
  }

  if (template?.requiresApiKey && !draft.apiKey.trim()) {
    errors.apiKey = t('models.errors.providerApiKeyRequired', { id: id || (template?.label ?? 'provider') })
  }

  if (toUniqueLines(draft.models).length === 0) {
    errors.models = t('models.errors.providerModelsRequired', { id: id || (template?.label ?? 'provider') })
  }

  return errors
}

export function validateRouteDraft(
  route: RouteDraft,
  providers: ProviderDraft[],
  t: TranslationFn,
): RouteFormErrors {
  const errors: RouteFormErrors = {}
  const providerId = resolveRouteProviderId(route, providers)
  const provider = providers.find((entry) => entry.id.trim() === providerId)

  if (!providerId) {
    errors.defaultProviderId = t('models.errors.defaultProviderRequired')
    return errors
  }

  if (!provider) {
    errors.defaultProviderId = t('models.errors.defaultProviderMissing')
    return errors
  }

  const providerModels = getProviderModels(provider)

  if (!route.primaryModel.trim()) {
    errors.primaryModel = t('models.errors.defaultModelRequired')
  } else if (!providerModels.includes(route.primaryModel.trim())) {
    errors.primaryModel = t('models.errors.primaryModelInvalid')
  }

  const fallbackModels = Array.from(new Set(route.fallbackModels.map((item) => item.trim()).filter(Boolean)))
  const invalidFallbacks = fallbackModels.filter((item) => !providerModels.includes(item) || item === route.primaryModel.trim())

  if (invalidFallbacks.length > 0) {
    errors.fallbackModels = t('models.errors.fallbackModelsInvalid')
  }

  return errors
}

export function createProviderDraft(type: ModelProviderType, existing: ProviderDraft[]): ProviderDraft {
  const template = getModelProviderTemplate(type)

  return {
    id: buildNextProviderId(type, existing),
    type,
    baseUrl: template?.defaultBaseUrl ?? '',
    api: template?.defaultApi ?? '',
    models: '',
    apiKey: '',
  }
}

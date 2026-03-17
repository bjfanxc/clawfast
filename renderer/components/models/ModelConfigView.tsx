'use client'

import React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import JSON5 from 'json5'
import { Check, ChevronDown, Loader2, PencilLine, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { loadConfigSnapshot, saveConfigSnapshot } from '@/domain/config/config-service'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/store/toast-store'
import {
  MODEL_PROVIDER_TEMPLATES,
  getModelProviderLabelKey,
  getModelProviderTemplate,
  inferModelProviderType,
  normalizeProviderApiKey,
  type ModelProviderType,
} from '../../../shared/model-providers'
import type { ConfigSnapshot } from '../../../shared/config'

type RouteDraft = {
  primaryModel: string
  defaultProviderId: string
  fallbackModels: string[]
}

type ProviderDraft = {
  id: string
  type: ModelProviderType
  baseUrl: string
  api: string
  models: string
  apiKey: string
}

type ProviderFormErrors = Partial<Record<'id' | 'baseUrl' | 'api' | 'apiKey' | 'models', string>>
type RouteFormErrors = Partial<Record<'defaultProviderId' | 'primaryModel' | 'fallbackModels', string>>

type ProviderEditorState = {
  open: boolean
  step: 'select' | 'form'
  mode: 'create' | 'edit'
  index: number | null
  draft: ProviderDraft | null
  errors: ProviderFormErrors
}

function parseJson(raw: string) {
  try {
    const parsed = JSON5.parse(raw) as Record<string, unknown>
    return { ok: true as const, value: parsed }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : String(error) }
  }
}

function stringifyConfig(value: Record<string, unknown>) {
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

function toUniqueLines(input: string) {
  return Array.from(
    new Set(
      input
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  )
}

function prefixModelId(providerId: string, modelId: string) {
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

function buildNextProviderId(type: ModelProviderType, drafts: ProviderDraft[]) {
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

function buildProviderDrafts(config: Record<string, unknown> | null): ProviderDraft[] {
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

function buildRouteDraft(config: Record<string, unknown> | null, providerIds: string[]): RouteDraft {
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

function mergeProviderConfig(base: Record<string, unknown>, drafts: ProviderDraft[]) {
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

function mergeRouteConfig(base: Record<string, unknown>, route: RouteDraft) {
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

function getProviderModels(provider: ProviderDraft | undefined) {
  return toUniqueLines(provider?.models ?? '')
}

function resolveRouteProviderId(route: RouteDraft, providers: ProviderDraft[]) {
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

function sanitizeRouteDraft(route: RouteDraft, providers: ProviderDraft[]) {
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

function validateProviderDraft(
  draft: ProviderDraft,
  providerIds: string[],
  t: ReturnType<typeof useTranslation>['t'],
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

function validateRouteDraft(
  route: RouteDraft,
  providers: ProviderDraft[],
  t: ReturnType<typeof useTranslation>['t'],
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

function DropdownField({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder: string
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const selected = options.find((option) => option.value === value) ?? null

  React.useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  React.useEffect(() => {
    if (disabled && open) {
      setOpen(false)
    }
  }, [disabled, open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        className="flex h-11 w-full items-center justify-between rounded-2xl border border-input bg-background px-3 text-left text-sm text-foreground transition hover:border-ring/40 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-muted/35"
        onClick={() => setOpen((current) => !current)}
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>{selected?.label ?? placeholder}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-border/90 bg-popover shadow-[0_20px_50px_-24px_rgba(15,23,42,0.45)]">
          <div className="max-h-64 overflow-y-auto p-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition',
                  option.value === value ? 'bg-primary/10 text-foreground' : 'text-foreground hover:bg-muted/70',
                )}
                onClick={() => {
                  setOpen(false)
                  onChange(option.value)
                }}
              >
                <span className="truncate">{option.label}</span>
                {option.value === value ? <Check className="ml-3 h-4 w-4 shrink-0 text-primary" /> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function FieldError({ error }: { error?: string }) {
  if (!error) {
    return null
  }

  return <div className="text-xs text-red-600 dark:text-red-300">{error}</div>
}

function ProviderIcon({ type, className }: { type: ModelProviderType; className?: string }) {
  const template = getModelProviderTemplate(type)
  if (!template) {
    return null
  }

  return (
    <div
      className={cn('flex h-11 w-11 items-center justify-center rounded-2xl border border-border/80 bg-card shadow-sm dark:bg-muted/35', className)}
      style={{ boxShadow: `0 12px 28px -20px ${template.tint}` }}
    >
      <img src={template.iconSrc} alt={template.label} className="h-6 w-6 object-contain" />
    </div>
  )
}

function createProviderDraft(type: ModelProviderType, existing: ProviderDraft[]): ProviderDraft {
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

const EMPTY_EDITOR: ProviderEditorState = {
  open: false,
  step: 'form',
  mode: 'create',
  index: null,
  draft: null,
  errors: {},
}

function ProviderEditorForm({
  draft,
  errors,
  template,
  showsApiField,
  t,
  onDraftChange,
}: {
  draft: ProviderDraft
  errors: ProviderFormErrors
  template: ReturnType<typeof getModelProviderTemplate> | undefined
  showsApiField: boolean
  t: ReturnType<typeof useTranslation>['t']
  onDraftChange: (updater: (draft: ProviderDraft) => ProviderDraft, errorKey?: keyof ProviderFormErrors) => void
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4 rounded-[24px] border border-border/80 bg-muted/15 p-4">
        <ProviderIcon type={draft.type} />
        <div className="space-y-1">
          <div className="text-lg font-semibold tracking-tight text-foreground">{t(getModelProviderLabelKey(draft.type))}</div>
          <div className="text-sm leading-7 text-muted-foreground">{template?.defaultBaseUrl || t('models.providerTypeCustomHint')}</div>
        </div>
      </div>

      <div className={cn('grid gap-4', showsApiField ? 'lg:grid-cols-2' : '')}>
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t('models.providerId')}</div>
          <Input
            value={draft.id}
            onChange={(event) => onDraftChange((current) => ({ ...current, id: event.target.value }), 'id')}
            placeholder={t('models.providerIdPlaceholder')}
            className="h-11 rounded-2xl border-border/80 bg-muted/35"
          />
          <FieldError error={errors.id} />
        </div>

        {showsApiField ? (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t('models.providerApi')}</div>
            <Input
              value={draft.api}
              onChange={(event) => onDraftChange((current) => ({ ...current, api: event.target.value }), 'api')}
              placeholder={template?.defaultApi || 'openai-completions'}
              className="h-11 rounded-2xl border-border/80 bg-muted/35"
            />
            <FieldError error={errors.api} />
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t('models.providerBaseUrl')}</div>
          <Input
            value={draft.baseUrl}
            onChange={(event) => onDraftChange((current) => ({ ...current, baseUrl: event.target.value }), 'baseUrl')}
            placeholder={template?.defaultBaseUrl || t('models.providerBaseUrlPlaceholder')}
            className="h-11 rounded-2xl border-border/80 bg-muted/35"
          />
          <FieldError error={errors.baseUrl} />
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t('models.providerApiKey')}</div>
          <Input
            value={draft.apiKey}
            onChange={(event) => onDraftChange((current) => ({ ...current, apiKey: event.target.value }), 'apiKey')}
            placeholder={template?.apiKeyPlaceholder || t('models.providerApiKeyPlaceholder')}
            className="h-11 rounded-2xl border-border/80 bg-muted/35"
          />
          <FieldError error={errors.apiKey} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t('models.providerModels')}</div>
        <Textarea
          value={draft.models}
          onChange={(event) => onDraftChange((current) => ({ ...current, models: event.target.value }), 'models')}
          placeholder={template?.modelPlaceholder || t('models.providerModelsPlaceholder')}
          className="min-h-[148px] resize-none rounded-2xl border-border/80 bg-muted/35"
        />
        <div className="text-xs text-muted-foreground">{t('models.providerModelsHelp')}</div>
        <FieldError error={errors.models} />
      </div>
    </div>
  )
}

export default function ModelConfigView() {
  const { t } = useTranslation()
  const pushToast = useToastStore((state) => state.pushToast)
  const [snapshot, setSnapshot] = React.useState<ConfigSnapshot | null>(null)
  const [raw, setRaw] = React.useState('')
  const [rawError, setRawError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [savingProviders, setSavingProviders] = React.useState(false)
  const [savingRoute, setSavingRoute] = React.useState(false)
  const [providers, setProviders] = React.useState<ProviderDraft[]>([])
  const [route, setRoute] = React.useState<RouteDraft>({ primaryModel: '', defaultProviderId: '', fallbackModels: [] })
  const [routeErrors, setRouteErrors] = React.useState<RouteFormErrors>({})
  const [providerEditor, setProviderEditor] = React.useState<ProviderEditorState>(EMPTY_EDITOR)

  const refresh = React.useCallback(async () => {
    setLoading(true)
    setRawError(null)

    try {
      const next = await loadConfigSnapshot()
      setSnapshot(next)
      const rawText = typeof next.raw === 'string' ? next.raw : stringifyConfig(next.config ?? {})
      setRaw(rawText)

      const parsed = parseJson(rawText)
      if (!parsed.ok) {
        setRawError(parsed.error)
        setProviders([])
        setRoute({ primaryModel: '', defaultProviderId: '', fallbackModels: [] })
        return
      }

      const nextProviders = buildProviderDrafts(parsed.value)
      setProviders(nextProviders)
      setRoute(buildRouteDraft(parsed.value, nextProviders.map((entry) => entry.id.trim()).filter(Boolean)))
      setRouteErrors({})
    } catch (error) {
      pushToast('error', `${t('models.loadFailed')}: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
    }
  }, [pushToast, t])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const providerOptions = providers.map((entry) => entry.id.trim()).filter(Boolean)
  const selectedProvider = providers.find((entry) => entry.id.trim() === route.defaultProviderId.trim())
  const selectedProviderModels = getProviderModels(selectedProvider)
  const canConfigureRoute = providers.length > 0
  const editorTemplate = providerEditor.draft ? getModelProviderTemplate(providerEditor.draft.type) : null
  const editorShowsApiField = providerEditor.draft?.type === 'custom'

  const persistConfig = async (updater: (config: Record<string, unknown>) => { config: Record<string, unknown>; infoToast?: string }) => {
    if (!snapshot?.hash) {
      pushToast('error', t('models.missingHash'))
      return null
    }

    const parsed = parseJson(raw)
    if (!parsed.ok) {
      setRawError(parsed.error)
      pushToast('error', `${t('models.saveFailed')}: ${parsed.error}`)
      return null
    }

    const base = { ...parsed.value }
    const { config, infoToast } = updater(base)
    const nextRaw = stringifyConfig(config)

    const updated = await saveConfigSnapshot({
      raw: nextRaw,
      baseHash: snapshot.hash,
    })

    const updatedRaw = typeof updated.raw === 'string' ? updated.raw : nextRaw
    const updatedParsed = parseJson(updatedRaw)

    setSnapshot(updated)
    setRaw(updatedRaw)

    if (updatedParsed.ok) {
      const nextProviders = buildProviderDrafts(updatedParsed.value)
      setProviders(nextProviders)
      setRoute(buildRouteDraft(updatedParsed.value, nextProviders.map((entry) => entry.id.trim()).filter(Boolean)))
    }

    if (infoToast) {
      pushToast('success', infoToast)
    }

    return updated
  }

  const saveProviders = async (nextProviders: ProviderDraft[], successMessage: string) => {
    setSavingProviders(true)
    setRawError(null)

    try {
      const sanitizedRouteResult = sanitizeRouteDraft(route, nextProviders)
      await persistConfig((config) => {
        mergeProviderConfig(config, nextProviders)
        mergeRouteConfig(config, sanitizedRouteResult.route)
        return {
          config,
          infoToast: sanitizedRouteResult.changed
            ? `${successMessage} · ${t('models.providersAdjustedRoute')}`
            : successMessage,
        }
      })
      setProviderEditor(EMPTY_EDITOR)
    } catch (error) {
      pushToast('error', `${t('models.saveFailed')}: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setSavingProviders(false)
    }
  }

  const handleProviderSubmit = async () => {
    if (!providerEditor.draft) {
      return
    }

    const nextProviders =
      providerEditor.mode === 'edit' && providerEditor.index !== null
        ? providers.map((entry, index) => (index === providerEditor.index ? providerEditor.draft ?? entry : entry))
        : [...providers, providerEditor.draft]

    const providerIds = nextProviders.map((entry) => entry.id.trim()).filter(Boolean)
    const errors = validateProviderDraft(providerEditor.draft, providerIds, t)
    setProviderEditor((prev) => ({ ...prev, errors }))

    if (Object.keys(errors).length > 0) {
      return
    }

    await saveProviders(nextProviders, t(providerEditor.mode === 'edit' ? 'models.providerUpdated' : 'models.providerCreated'))
  }

  const handleDeleteProvider = async (index: number) => {
    const nextProviders = providers.filter((_, providerIndex) => providerIndex !== index)
    await saveProviders(nextProviders, t('models.providerDeleted'))
  }

  const handleSaveRoute = async () => {
    const errors = validateRouteDraft(route, providers, t)
    setRouteErrors(errors)
    if (Object.keys(errors).length > 0) {
      return
    }

    setSavingRoute(true)
    setRawError(null)

    try {
      await persistConfig((config) => {
        mergeRouteConfig(config, route)
        return { config, infoToast: t('models.routeSaved') }
      })
    } catch (error) {
      pushToast('error', `${t('models.saveFailed')}: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setSavingRoute(false)
    }
  }

  const openCreateProvider = () => {
    setProviderEditor({
      open: true,
      step: 'form',
      mode: 'create',
      index: null,
      draft: createProviderDraft(MODEL_PROVIDER_TEMPLATES[0]?.type ?? 'openai', providers),
      errors: {},
    })
  }

  const openEditProvider = (index: number) => {
    setProviderEditor({
      open: true,
      step: 'form',
      mode: 'edit',
      index,
      draft: { ...providers[index] },
      errors: {},
    })
  }

  const closeEditor = () => {
    if (savingProviders) {
      return
    }
    setProviderEditor(EMPTY_EDITOR)
  }

  const updateProviderEditorDraft = (updater: (draft: ProviderDraft) => ProviderDraft, errorKey?: keyof ProviderFormErrors) => {
    setProviderEditor((prev) => {
      if (!prev.draft) {
        return prev
      }

      return {
        ...prev,
        draft: updater(prev.draft),
        errors: errorKey ? { ...prev.errors, [errorKey]: undefined } : prev.errors,
      }
    })
  }

  return (
    <div className="h-full flex-1 overflow-auto bg-background p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:gap-5">
            <h1 className="text-3xl font-bold tracking-tight">{t('models.title')}</h1>
            <p className="text-sm text-muted-foreground lg:pb-1">{t('models.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" className="rounded-2xl px-4" onClick={() => void refresh()} disabled={loading || savingProviders || savingRoute}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {t('models.refresh')}
            </Button>
          </div>
        </div>

        {rawError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            {rawError}
          </div>
        ) : null}

        <Card className="rounded-[28px] border-border/80 shadow-sm">
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:gap-5">
              <CardTitle className="text-2xl font-bold">{t('models.providersTitle')}</CardTitle>
              <CardDescription className="lg:pb-1">{t('models.providersHint')}</CardDescription>
            </div>
            <Button type="button" className="rounded-2xl px-4" onClick={openCreateProvider} disabled={loading || savingProviders}>
              <Plus className="mr-2 h-4 w-4" />
              {t('models.providerAdd')}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {providers.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-border bg-muted/20 px-5 py-8 text-sm text-muted-foreground">
                {t('models.providersEmpty')}
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {providers.map((provider, index) => {
                  const modelCount = getProviderModels(provider).length

                  return (
                    <div key={`${provider.id}-${index}`} className="rounded-[24px] border border-border/80 bg-card/95 p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-4">
                          <ProviderIcon type={provider.type} />
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="truncate text-lg font-semibold text-foreground">{provider.id}</div>
                              <div className="rounded-full border border-border/70 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground">
                                {t(getModelProviderLabelKey(provider.type))}
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">{provider.baseUrl}</div>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span className="rounded-full bg-muted/30 px-2.5 py-1">{t('models.providerModelsCount', { count: modelCount })}</span>
                              <span className="rounded-full bg-muted/30 px-2.5 py-1">
                                {provider.apiKey.trim() ? t('models.providerApiKeyConfigured') : t('models.providerApiKeyMissing')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-12 w-12 rounded-2xl text-muted-foreground"
                            onClick={() => openEditProvider(index)}
                            disabled={savingProviders}
                          >
                            <PencilLine className="h-5 w-5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-12 w-12 rounded-2xl text-muted-foreground hover:text-red-500"
                            onClick={() => void handleDeleteProvider(index)}
                            disabled={savingProviders}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-border/80 shadow-sm">
          <CardHeader className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:gap-5">
              <CardTitle className="text-2xl font-bold">{t('models.routeTitle')}</CardTitle>
              <CardDescription className="lg:pb-1">{t('models.routeHint')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {!canConfigureRoute ? (
              <div className="rounded-[24px] border border-dashed border-border bg-muted/20 px-5 py-8 text-sm text-muted-foreground">
                {t('models.routeDisabledHint')}
              </div>
            ) : (
              <>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t('models.defaultProvider')}
                    </div>
                    <DropdownField
                      value={route.defaultProviderId}
                      options={[
                        { value: '', label: t('models.defaultProviderPlaceholder') },
                        ...providerOptions.map((providerId) => ({ value: providerId, label: providerId })),
                      ]}
                      placeholder={t('models.defaultProviderPlaceholder')}
                      onChange={(value) => {
                        const provider = providers.find((entry) => entry.id.trim() === value)
                        const models = getProviderModels(provider)
                        setRoute({
                          defaultProviderId: value,
                          primaryModel: models.includes(route.primaryModel) ? route.primaryModel : '',
                          fallbackModels: route.fallbackModels.filter((item) => models.includes(item)),
                        })
                        setRouteErrors((prev) => ({ ...prev, defaultProviderId: undefined, primaryModel: undefined, fallbackModels: undefined }))
                      }}
                    />
                    <FieldError error={routeErrors.defaultProviderId} />
                  </div>

                  <div className="rounded-[24px] border border-border/70 bg-muted/15 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {t('models.routePreviewPrimary')}
                    </div>
                    <div className="mt-2 text-base font-medium text-foreground">
                      {prefixModelId(route.defaultProviderId, route.primaryModel) || t('models.emptyValue')}
                    </div>
                    <div className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {t('models.routePreviewFallbacks')}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {route.fallbackModels.length > 0 ? (
                        route.fallbackModels.map((modelId) => (
                          <div key={modelId} className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs text-foreground">
                            {prefixModelId(route.defaultProviderId, modelId)}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground">{t('models.emptyValue')}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t('models.primary')}
                  </div>
                  {selectedProviderModels.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                      {t('models.primaryDisabledHint')}
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {selectedProviderModels.map((modelId) => {
                        const active = route.primaryModel === modelId
                        return (
                          <button
                            key={modelId}
                            type="button"
                            className={cn(
                              'rounded-[22px] border px-4 py-4 text-left transition',
                              active
                                ? 'app-selection-card-active'
                                : 'app-selection-card',
                            )}
                            onClick={() => {
                              setRoute((prev) => ({
                                ...prev,
                                primaryModel: modelId,
                                fallbackModels: prev.fallbackModels.filter((item) => item !== modelId),
                              }))
                              setRouteErrors((prev) => ({ ...prev, primaryModel: undefined, fallbackModels: undefined }))
                            }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-medium">{modelId}</div>
                              {active ? <Check className="h-4 w-4" /> : null}
                            </div>
                            <div className={cn('mt-2 text-xs', active ? 'text-foreground/70' : 'text-muted-foreground')}>
                              {t('models.primarySelectHint')}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                  <FieldError error={routeErrors.primaryModel} />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t('models.fallbacks')}
                    </div>
                    <div className="text-xs text-muted-foreground">{t('models.fallbacksHint')}</div>
                  </div>
                  {selectedProviderModels.length === 0 ? null : (
                    <div className="flex flex-wrap gap-2">
                      {selectedProviderModels.map((modelId) => {
                        const disabled = modelId === route.primaryModel
                        const active = route.fallbackModels.includes(modelId)
                        return (
                          <button
                            key={modelId}
                            type="button"
                            disabled={disabled}
                            className={cn(
                              'rounded-full border px-3 py-2 text-sm transition',
                              disabled
                                ? 'cursor-not-allowed border-border/60 bg-muted/20 text-muted-foreground opacity-60'
                              : active
                                  ? 'app-selection-chip-active'
                                  : 'app-selection-chip',
                            )}
                            onClick={() => {
                              setRoute((prev) => ({
                                ...prev,
                                fallbackModels: active
                                  ? prev.fallbackModels.filter((item) => item !== modelId)
                                  : [...prev.fallbackModels, modelId],
                              }))
                              setRouteErrors((prev) => ({ ...prev, fallbackModels: undefined }))
                            }}
                          >
                            {modelId}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  <FieldError error={routeErrors.fallbackModels} />
                </div>

                <div className="flex justify-end">
                  <Button className="rounded-2xl px-4" onClick={() => void handleSaveRoute()} disabled={savingRoute || savingProviders || !canConfigureRoute}>
                    {savingRoute ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {t('models.routeSave')}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog.Root open={providerEditor.open} onOpenChange={(open) => (open ? undefined : closeEditor())}>
        <Dialog.Portal>
          <Dialog.Overlay className="app-overlay-scrim fixed inset-0 z-50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="app-dialog-shell fixed left-1/2 top-1/2 z-50 flex max-h-[86vh] w-[min(1120px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[32px] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            <div className="app-dialog-section flex items-start justify-between gap-4 border-b px-6 py-5">
              <div className="space-y-2">
                <Dialog.Title className="text-xl font-semibold tracking-tight text-foreground">
                  {t(providerEditor.mode === 'edit' ? 'models.providerEditorTitleEdit' : 'models.providerEditorTitleCreate')}
                </Dialog.Title>
                <Dialog.Description className="text-sm leading-7 text-muted-foreground">
                  {t('models.providerEditorHintForm')}
                </Dialog.Description>
              </div>
              <Button type="button" variant="ghost" className="h-14 w-14 rounded-[20px] text-muted-foreground" onClick={closeEditor}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
              {providerEditor.draft ? (
                providerEditor.mode === 'create' ? (
                  <div className="grid min-h-0 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
                    <div className="app-soft-surface rounded-[28px] p-4">
                      <div className="space-y-3">
                        {MODEL_PROVIDER_TEMPLATES.map((template) => {
                          const active = providerEditor.draft?.type === template.type
                          return (
                            <button
                              key={template.type}
                              type="button"
                              className={cn(
                                'w-full rounded-[24px] border px-4 py-4 text-left transition',
                                active ? 'app-selection-card-active' : 'app-selection-card',
                              )}
                              onClick={() =>
                                setProviderEditor((prev) => ({
                                  ...prev,
                                  step: 'form',
                                  mode: 'create',
                                  index: null,
                                  draft: createProviderDraft(template.type, providers),
                                  errors: {},
                                }))
                              }
                            >
                              <div className="flex items-start gap-4">
                                <ProviderIcon type={template.type} className="h-10 w-10 rounded-[18px]" />
                                <div className="min-w-0 space-y-1.5">
                                  <div className="text-lg font-semibold tracking-tight text-foreground">
                                    {t(getModelProviderLabelKey(template.type))}
                                  </div>
                                  <div className="line-clamp-2 text-sm text-muted-foreground">
                                    {template.defaultBaseUrl || t('models.providerTypeCustomHint')}
                                  </div>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <ProviderEditorForm
                      draft={providerEditor.draft}
                      errors={providerEditor.errors}
                      template={editorTemplate}
                      showsApiField={editorShowsApiField}
                      t={t}
                      onDraftChange={updateProviderEditorDraft}
                    />
                  </div>
                ) : (
                  <ProviderEditorForm
                    draft={providerEditor.draft}
                    errors={providerEditor.errors}
                    template={editorTemplate}
                    showsApiField={editorShowsApiField}
                    t={t}
                    onDraftChange={updateProviderEditorDraft}
                  />
                )
              ) : null}
            </div>

            <div className="app-dialog-section flex items-center justify-end gap-3 border-t px-6 py-4">
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" className="rounded-2xl" onClick={closeEditor} disabled={savingProviders}>
                  {t('models.providerEditorCancel')}
                </Button>
                {providerEditor.draft ? (
                  <Button type="button" className="rounded-2xl px-4" onClick={() => void handleProviderSubmit()} disabled={savingProviders}>
                    {savingProviders ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {t('models.providerEditorSave')}
                  </Button>
                ) : null}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

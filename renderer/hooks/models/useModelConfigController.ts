import React from 'react'
import { loadConfigSnapshot, saveConfigSnapshot } from '@/domain/config/config-service'
import type { ModelConfigController, ProviderDraft, ProviderEditorState, ProviderFormErrors, RouteDraft, RouteFormErrors, TranslationFn } from '@/lib/models'
import {
  MODEL_PROVIDER_TEMPLATES,
  buildProviderDrafts,
  buildRouteDraft,
  createProviderDraft,
  getModelProviderTemplate,
  getProviderModels,
  mergeProviderConfig,
  mergeRouteConfig,
  parseJson,
  sanitizeRouteDraft,
  stringifyConfig,
  type ModelProviderType,
  validateProviderDraft,
  validateRouteDraft,
} from '@/lib/models'
import type { ConfigSnapshot } from '../../../shared/config'

const EMPTY_ROUTE: RouteDraft = { primaryModel: '', defaultProviderId: '', fallbackModels: [] }

const EMPTY_EDITOR: ProviderEditorState = {
  open: false,
  step: 'form',
  mode: 'create',
  index: null,
  draft: null,
  errors: {},
}

export function useModelConfigController(
  t: TranslationFn,
  pushToast: (type: 'success' | 'error' | 'info', message: string) => void
): ModelConfigController {
  const [snapshot, setSnapshot] = React.useState<ConfigSnapshot | null>(null)
  const [raw, setRaw] = React.useState('')
  const [rawError, setRawError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [savingProviders, setSavingProviders] = React.useState(false)
  const [savingRoute, setSavingRoute] = React.useState(false)
  const [providers, setProviders] = React.useState<ProviderDraft[]>([])
  const [route, setRoute] = React.useState<RouteDraft>(EMPTY_ROUTE)
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
        setRoute(EMPTY_ROUTE)
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

  const persistConfig = React.useCallback(async (updater: (config: Record<string, unknown>) => { config: Record<string, unknown>; infoToast?: string }) => {
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
  }, [pushToast, raw, snapshot?.hash, t])

  const saveProviders = React.useCallback(async (nextProviders: ProviderDraft[], successMessage: string) => {
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
  }, [persistConfig, pushToast, route, t])

  const handleProviderSubmit = React.useCallback(async () => {
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
  }, [providerEditor, providers, saveProviders, t])

  const handleDeleteProvider = React.useCallback(async (index: number) => {
    const nextProviders = providers.filter((_, providerIndex) => providerIndex !== index)
    await saveProviders(nextProviders, t('models.providerDeleted'))
  }, [providers, saveProviders, t])

  const handleSaveRoute = React.useCallback(async () => {
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
  }, [persistConfig, providers, pushToast, route, t])

  const openCreateProvider = React.useCallback(() => {
    setProviderEditor({
      open: true,
      step: 'form',
      mode: 'create',
      index: null,
      draft: createProviderDraft(MODEL_PROVIDER_TEMPLATES[0]?.type ?? 'openai', providers),
      errors: {},
    })
  }, [providers])

  const selectCreateProviderType = React.useCallback((type: ModelProviderType) => {
    setProviderEditor((prev) => ({
      ...prev,
      step: 'form',
      mode: 'create',
      index: null,
      draft: createProviderDraft(type, providers),
      errors: {},
    }))
  }, [providers])

  const openEditProvider = React.useCallback((index: number) => {
    setProviderEditor({
      open: true,
      step: 'form',
      mode: 'edit',
      index,
      draft: { ...providers[index] },
      errors: {},
    })
  }, [providers])

  const closeEditor = React.useCallback(() => {
    if (savingProviders) {
      return
    }
    setProviderEditor(EMPTY_EDITOR)
  }, [savingProviders])

  const updateProviderEditorDraft = React.useCallback((updater: (draft: ProviderDraft) => ProviderDraft, errorKey?: keyof ProviderFormErrors) => {
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
  }, [])

  const setDefaultProvider = React.useCallback((value: string) => {
    const provider = providers.find((entry) => entry.id.trim() === value)
    const models = getProviderModels(provider)
    setRoute((prev) => ({
      defaultProviderId: value,
      primaryModel: models.includes(prev.primaryModel) ? prev.primaryModel : '',
      fallbackModels: prev.fallbackModels.filter((item) => models.includes(item)),
    }))
    setRouteErrors((prev) => ({ ...prev, defaultProviderId: undefined, primaryModel: undefined, fallbackModels: undefined }))
  }, [providers])

  const setPrimaryModel = React.useCallback((modelId: string) => {
    setRoute((prev) => ({
      ...prev,
      primaryModel: modelId,
      fallbackModels: prev.fallbackModels.filter((item) => item !== modelId),
    }))
    setRouteErrors((prev) => ({ ...prev, primaryModel: undefined, fallbackModels: undefined }))
  }, [])

  const toggleFallbackModel = React.useCallback((modelId: string) => {
    setRoute((prev) => ({
      ...prev,
      fallbackModels: prev.fallbackModels.includes(modelId)
        ? prev.fallbackModels.filter((item) => item !== modelId)
        : [...prev.fallbackModels, modelId],
    }))
    setRouteErrors((prev) => ({ ...prev, fallbackModels: undefined }))
  }, [])

  const providerOptions = providers.map((entry) => entry.id.trim()).filter(Boolean)
  const selectedProvider = providers.find((entry) => entry.id.trim() === route.defaultProviderId.trim())
  const selectedProviderModels = getProviderModels(selectedProvider)
  const canConfigureRoute = providers.length > 0
  const editorTemplate = providerEditor.draft ? getModelProviderTemplate(providerEditor.draft.type) : null
  const editorShowsApiField = providerEditor.draft?.type === 'custom'

  const state: ModelConfigController['state'] = {
    rawError,
    loading,
    savingProviders,
    savingRoute,
    providers,
    route,
    routeErrors,
    providerEditor,
  }

  const derived: ModelConfigController['derived'] = {
    providerOptions,
    selectedProviderModels,
    canConfigureRoute,
    editorTemplate,
    editorShowsApiField,
  }

  const actions: ModelConfigController['actions'] = {
    refresh,
  }

  const providerActions: ModelConfigController['providerActions'] = {
    handleProviderSubmit,
    handleDeleteProvider,
    openCreateProvider,
    openEditProvider,
  }

  const routeActions: ModelConfigController['routeActions'] = {
    handleSaveRoute,
    setDefaultProvider,
    setPrimaryModel,
    toggleFallbackModel,
  }

  const editorActions: ModelConfigController['editorActions'] = {
    selectCreateProviderType,
    closeEditor,
    updateProviderEditorDraft,
  }

  const controller = {
    state,
    derived,
    actions,
    providerActions,
    routeActions,
    editorActions,
  } satisfies ModelConfigController

  return controller
}

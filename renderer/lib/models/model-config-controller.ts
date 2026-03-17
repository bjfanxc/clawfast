import type { ProviderDraft, ProviderEditorState, ProviderFormErrors, RouteDraft, RouteFormErrors } from './model-config-types'
import type { getModelProviderTemplate, ModelProviderType } from './model-provider-registry'

export type ModelConfigController = {
  state: {
    rawError: string | null
    loading: boolean
    savingProviders: boolean
    savingRoute: boolean
    providers: ProviderDraft[]
    route: RouteDraft
    routeErrors: RouteFormErrors
    providerEditor: ProviderEditorState
  }
  derived: {
    providerOptions: string[]
    selectedProviderModels: string[]
    canConfigureRoute: boolean
    editorTemplate: ReturnType<typeof getModelProviderTemplate> | null
    editorShowsApiField: boolean
  }
  actions: {
    refresh: () => Promise<void>
  }
  providerActions: {
    handleProviderSubmit: () => Promise<void>
    handleDeleteProvider: (index: number) => Promise<void>
    openCreateProvider: () => void
    openEditProvider: (index: number) => void
  }
  routeActions: {
    handleSaveRoute: () => Promise<void>
    setDefaultProvider: (value: string) => void
    setPrimaryModel: (modelId: string) => void
    toggleFallbackModel: (modelId: string) => void
  }
  editorActions: {
    selectCreateProviderType: (type: ModelProviderType) => void
    closeEditor: () => void
    updateProviderEditorDraft: (updater: (draft: ProviderDraft) => ProviderDraft, errorKey?: keyof ProviderFormErrors) => void
  }
}

export type ModelConfigControllerState = ModelConfigController['state']
export type ModelConfigControllerDerived = ModelConfigController['derived']
export type ModelConfigControllerActions = ModelConfigController['actions']
export type ModelConfigProviderActions = ModelConfigController['providerActions']
export type ModelConfigRouteActions = ModelConfigController['routeActions']
export type ModelConfigEditorActions = ModelConfigController['editorActions']

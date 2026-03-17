import type { ModelProviderType } from '../../../shared/model-providers'
import type { TFunction } from 'i18next'

export type RouteDraft = {
  primaryModel: string
  defaultProviderId: string
  fallbackModels: string[]
}

export type ProviderDraft = {
  id: string
  type: ModelProviderType
  baseUrl: string
  api: string
  models: string
  apiKey: string
}

export type ProviderFormErrors = Partial<Record<'id' | 'baseUrl' | 'api' | 'apiKey' | 'models', string>>
export type RouteFormErrors = Partial<Record<'defaultProviderId' | 'primaryModel' | 'fallbackModels', string>>

export type ProviderEditorState = {
  open: boolean
  step: 'select' | 'form'
  mode: 'create' | 'edit'
  index: number | null
  draft: ProviderDraft | null
  errors: ProviderFormErrors
}

export type TranslationFn = TFunction

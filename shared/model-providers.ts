export type ModelProviderType =
  | 'openai'
  | 'anthropic'
  | 'openrouter'
  | 'ollama'
  | 'custom'

export type ModelProviderTemplate = {
  type: ModelProviderType
  label: string
  defaultIdPrefix: string
  defaultBaseUrl: string
  defaultApi: string
  modelPlaceholder: string
  apiKeyPlaceholder: string
  requiresApiKey: boolean
  iconSrc: string
  tint: string
}

export const MODEL_PROVIDER_TEMPLATES: ModelProviderTemplate[] = [
  {
    type: 'openai',
    label: 'OpenAI',
    defaultIdPrefix: 'openai',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultApi: 'openai-responses',
    modelPlaceholder: 'gpt-4.1',
    apiKeyPlaceholder: 'OPENAI_API_KEY or sk-...',
    requiresApiKey: true,
    iconSrc: '/images/providers/openai.svg',
    tint: '#10A37F',
  },
  {
    type: 'anthropic',
    label: 'Anthropic',
    defaultIdPrefix: 'anthropic',
    defaultBaseUrl: 'https://api.anthropic.com',
    defaultApi: 'anthropic-messages',
    modelPlaceholder: 'claude-sonnet-4-5',
    apiKeyPlaceholder: 'ANTHROPIC_API_KEY or sk-ant-...',
    requiresApiKey: true,
    iconSrc: '/images/providers/anthropic.svg',
    tint: '#C78B5A',
  },
  {
    type: 'openrouter',
    label: 'OpenRouter',
    defaultIdPrefix: 'openrouter',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultApi: 'openai-completions',
    modelPlaceholder: 'anthropic/claude-3.7-sonnet',
    apiKeyPlaceholder: 'OPENROUTER_API_KEY or sk-or-...',
    requiresApiKey: true,
    iconSrc: '/images/providers/openrouter.svg',
    tint: '#2563EB',
  },
  {
    type: 'ollama',
    label: 'Ollama',
    defaultIdPrefix: 'ollama',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultApi: 'openai-completions',
    modelPlaceholder: 'qwen3:latest',
    apiKeyPlaceholder: 'optional',
    requiresApiKey: false,
    iconSrc: '/images/providers/ollama.svg',
    tint: '#F97316',
  },
  {
    type: 'custom',
    label: 'Custom',
    defaultIdPrefix: 'custom',
    defaultBaseUrl: '',
    defaultApi: 'openai-completions',
    modelPlaceholder: 'your-model-id',
    apiKeyPlaceholder: 'ENV_NAME or api key',
    requiresApiKey: true,
    iconSrc: '/images/providers/custom.svg',
    tint: '#64748B',
  },
]

export const OLLAMA_PLACEHOLDER_API_KEY = 'ollama-local'

export function getModelProviderTemplate(type: ModelProviderType) {
  return MODEL_PROVIDER_TEMPLATES.find((entry) => entry.type === type)
}

export function getModelProviderLabelKey(type: ModelProviderType) {
  switch (type) {
    case 'openai':
      return 'models.providerTypes.openai'
    case 'anthropic':
      return 'models.providerTypes.anthropic'
    case 'openrouter':
      return 'models.providerTypes.openrouter'
    case 'ollama':
      return 'models.providerTypes.ollama'
    case 'custom':
    default:
      return 'models.providerTypes.custom'
  }
}

export function inferModelProviderType(
  providerId: string,
  entry: {
    baseUrl?: string
    api?: string
  },
): ModelProviderType {
  const normalizedId = providerId.trim().toLowerCase()
  const normalizedBaseUrl = (entry.baseUrl ?? '').trim().toLowerCase()
  const normalizedApi = (entry.api ?? '').trim().toLowerCase()

  if (normalizedId.includes('openrouter') || normalizedBaseUrl.includes('openrouter.ai')) {
    return 'openrouter'
  }

  if (normalizedId.includes('ollama') || normalizedBaseUrl.includes('localhost:11434')) {
    return 'ollama'
  }

  if (normalizedId.includes('anthropic') || normalizedBaseUrl.includes('anthropic.com') || normalizedApi === 'anthropic-messages') {
    return 'anthropic'
  }

  if (normalizedId.includes('openai') || normalizedBaseUrl.includes('api.openai.com') || normalizedApi === 'openai-responses') {
    return 'openai'
  }

  return 'custom'
}

export function normalizeProviderApiKey(type: ModelProviderType, apiKey: string) {
  const trimmed = apiKey.trim()
  if (type === 'ollama') {
    return trimmed || OLLAMA_PLACEHOLDER_API_KEY
  }
  return trimmed
}

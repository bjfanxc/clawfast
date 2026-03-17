'use client'

import React from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { ProviderDraft, ProviderFormErrors, TranslationFn } from '@/lib/models'
import { getModelProviderLabelKey, getModelProviderTemplate, type ModelProviderType } from '@/lib/models'
import { cn } from '@/lib/utils'

export function DropdownField({
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

export function FieldError({ error }: { error?: string }) {
  if (!error) {
    return null
  }

  return <div className="text-xs text-red-600 dark:text-red-300">{error}</div>
}

export function ProviderIcon({ type, className }: { type: ModelProviderType; className?: string }) {
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

export function ProviderEditorForm({
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
  t: TranslationFn
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

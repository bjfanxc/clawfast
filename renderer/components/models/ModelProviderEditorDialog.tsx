'use client'

import React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Loader2, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProviderEditorForm, ProviderIcon } from './ModelConfigFields'
import type { ModelConfigEditorActions, ModelConfigProviderActions, ProviderEditorState, TranslationFn } from '@/lib/models'
import { MODEL_PROVIDER_TEMPLATES, getModelProviderLabelKey, getModelProviderTemplate } from '@/lib/models'
import { cn } from '@/lib/utils'

type ModelProviderEditorDialogProps = {
  t: TranslationFn
  providerEditor: ProviderEditorState
  savingProviders: boolean
  editorTemplate: ReturnType<typeof getModelProviderTemplate> | null
  editorShowsApiField: boolean
  onCloseEditor: ModelConfigEditorActions['closeEditor']
  onSelectCreateProviderType: ModelConfigEditorActions['selectCreateProviderType']
  onUpdateProviderEditorDraft: ModelConfigEditorActions['updateProviderEditorDraft']
  onSubmitProvider: ModelConfigProviderActions['handleProviderSubmit']
}

export default function ModelProviderEditorDialog({
  t,
  providerEditor,
  savingProviders,
  editorTemplate,
  editorShowsApiField,
  onCloseEditor,
  onSelectCreateProviderType,
  onUpdateProviderEditorDraft,
  onSubmitProvider,
}: ModelProviderEditorDialogProps) {
  return (
    <Dialog.Root open={providerEditor.open} onOpenChange={(open) => (open ? undefined : onCloseEditor())}>
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
            <Button type="button" variant="ghost" className="h-14 w-14 rounded-[20px] text-muted-foreground" onClick={onCloseEditor}>
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
                            onClick={() => onSelectCreateProviderType(template.type)}
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
                    template={editorTemplate ?? undefined}
                    showsApiField={editorShowsApiField}
                    t={t}
                    onDraftChange={onUpdateProviderEditorDraft}
                  />
                </div>
              ) : (
                <ProviderEditorForm
                  draft={providerEditor.draft}
                  errors={providerEditor.errors}
                  template={editorTemplate ?? undefined}
                  showsApiField={editorShowsApiField}
                  t={t}
                  onDraftChange={onUpdateProviderEditorDraft}
                />
              )
            ) : null}
          </div>

          <div className="app-dialog-section flex items-center justify-end gap-3 border-t px-6 py-4">
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" className="rounded-2xl" onClick={onCloseEditor} disabled={savingProviders}>
                {t('models.providerEditorCancel')}
              </Button>
              {providerEditor.draft ? (
                <Button type="button" className="rounded-2xl px-4" onClick={() => void onSubmitProvider()} disabled={savingProviders}>
                  {savingProviders ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {t('models.providerEditorSave')}
                </Button>
              ) : null}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

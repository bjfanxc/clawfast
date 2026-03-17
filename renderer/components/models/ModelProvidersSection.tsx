'use client'

import React from 'react'
import { PencilLine, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProviderIcon } from './ModelConfigFields'
import type { ModelConfigProviderActions, ProviderDraft, TranslationFn } from '@/lib/models'
import { getModelProviderLabelKey, getProviderModels } from '@/lib/models'

type ModelProvidersSectionProps = {
  t: TranslationFn
  loading: boolean
  savingProviders: boolean
  providers: ProviderDraft[]
  onCreateProvider: ModelConfigProviderActions['openCreateProvider']
  onEditProvider: ModelConfigProviderActions['openEditProvider']
  onDeleteProvider: ModelConfigProviderActions['handleDeleteProvider']
}

export default function ModelProvidersSection({
  t,
  loading,
  savingProviders,
  providers,
  onCreateProvider,
  onEditProvider,
  onDeleteProvider,
}: ModelProvidersSectionProps) {
  return (
    <Card className="rounded-[28px] border-border/80 shadow-sm">
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:gap-5">
          <CardTitle className="text-2xl font-bold">{t('models.providersTitle')}</CardTitle>
          <CardDescription className="lg:pb-1">{t('models.providersHint')}</CardDescription>
        </div>
        <Button type="button" className="rounded-2xl px-4" onClick={onCreateProvider} disabled={loading || savingProviders}>
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
                        onClick={() => onEditProvider(index)}
                        disabled={savingProviders}
                      >
                        <PencilLine className="h-5 w-5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-12 w-12 rounded-2xl text-muted-foreground hover:text-red-500"
                        onClick={() => void onDeleteProvider(index)}
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
  )
}

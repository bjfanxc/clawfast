'use client'

import React from 'react'
import { Check, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownField, FieldError } from './ModelConfigFields'
import type { ModelConfigRouteActions, RouteDraft, RouteFormErrors, TranslationFn } from '@/lib/models'
import { prefixModelId } from '@/lib/models'
import { cn } from '@/lib/utils'

type ModelRouteSectionProps = {
  t: TranslationFn
  route: RouteDraft
  routeErrors: RouteFormErrors
  providerOptions: string[]
  selectedProviderModels: string[]
  canConfigureRoute: boolean
  savingRoute: boolean
  savingProviders: boolean
  onSetDefaultProvider: ModelConfigRouteActions['setDefaultProvider']
  onSetPrimaryModel: ModelConfigRouteActions['setPrimaryModel']
  onToggleFallbackModel: ModelConfigRouteActions['toggleFallbackModel']
  onSaveRoute: ModelConfigRouteActions['handleSaveRoute']
}

export default function ModelRouteSection({
  t,
  route,
  routeErrors,
  providerOptions,
  selectedProviderModels,
  canConfigureRoute,
  savingRoute,
  savingProviders,
  onSetDefaultProvider,
  onSetPrimaryModel,
  onToggleFallbackModel,
  onSaveRoute,
}: ModelRouteSectionProps) {
  return (
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
                  onChange={onSetDefaultProvider}
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
                        onClick={() => onSetPrimaryModel(modelId)}
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
                        onClick={() => onToggleFallbackModel(modelId)}
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
              <Button className="rounded-2xl px-4" onClick={() => void onSaveRoute()} disabled={savingRoute || savingProviders || !canConfigureRoute}>
                {savingRoute ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t('models.routeSave')}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

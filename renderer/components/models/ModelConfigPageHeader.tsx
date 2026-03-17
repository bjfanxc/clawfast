'use client'

import React from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TranslationFn } from '@/lib/models'

type ModelConfigPageHeaderProps = {
  t: TranslationFn
  loading: boolean
  savingProviders: boolean
  savingRoute: boolean
  onRefresh: () => void
}

export default function ModelConfigPageHeader({
  t,
  loading,
  savingProviders,
  savingRoute,
  onRefresh,
}: ModelConfigPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:gap-5">
        <h1 className="text-3xl font-bold tracking-tight">{t('models.title')}</h1>
        <p className="text-sm text-muted-foreground lg:pb-1">{t('models.subtitle')}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" className="rounded-2xl px-4" onClick={onRefresh} disabled={loading || savingProviders || savingRoute}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {t('models.refresh')}
        </Button>
      </div>
    </div>
  )
}

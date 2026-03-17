'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'
import UsageViewContent from './UsageViewContent'
import { useUsageOverview } from '@/hooks/usage/useUsageOverview'
import { useToastStore } from '@/store/toast-store'

export default function UsageView() {
  const { t } = useTranslation()
  const pushToast = useToastStore((state) => state.pushToast)
  const handleError = React.useCallback((message: string) => {
    pushToast('error', message)
  }, [pushToast])
  const vm = useUsageOverview(t, handleError)

  return <UsageViewContent t={t} vm={vm} />
}

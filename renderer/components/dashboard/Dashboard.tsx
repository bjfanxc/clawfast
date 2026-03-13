'use client'

import React from 'react'
import DashboardOverview from './DashboardOverview'
import { useTranslation } from 'react-i18next'

export default function Dashboard({ refreshSignal = 0 }: { refreshSignal?: number }) {
  const { t } = useTranslation()

  return (
    <div className="flex-1 h-full overflow-y-auto overflow-x-hidden bg-background p-6 lg:p-8">
      <div className="mx-auto flex min-w-0 max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:gap-5">
          <h1 className="app-section-title">{t('nav.dashboard')}</h1>
          <p className="app-section-subtitle lg:pb-1">{t('dashboard.subtitle')}</p>
        </div>

        <DashboardOverview refreshSignal={refreshSignal} />
      </div>
    </div>
  )
}

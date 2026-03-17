'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'

import ModelConfigPageHeader from './ModelConfigPageHeader'
import ModelProvidersSection from './ModelProvidersSection'
import ModelRouteSection from './ModelRouteSection'
import ModelProviderEditorDialog from './ModelProviderEditorDialog'
import { useModelConfigController } from '@/hooks/models/useModelConfigController'
import { useToastStore } from '@/store/toast-store'

export default function ModelConfigView() {
  const { t } = useTranslation()
  const pushToast = useToastStore((state) => state.pushToast)
  const controller = useModelConfigController(t, pushToast)

  return (
    <div className="h-full flex-1 overflow-auto bg-background p-6 lg:p-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <ModelConfigPageHeader
          t={t}
          loading={controller.state.loading}
          savingProviders={controller.state.savingProviders}
          savingRoute={controller.state.savingRoute}
          onRefresh={() => void controller.actions.refresh()}
        />

        {controller.state.rawError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            {controller.state.rawError}
          </div>
        ) : null}

        <ModelProvidersSection
          t={t}
          loading={controller.state.loading}
          savingProviders={controller.state.savingProviders}
          providers={controller.state.providers}
          onCreateProvider={controller.providerActions.openCreateProvider}
          onEditProvider={controller.providerActions.openEditProvider}
          onDeleteProvider={controller.providerActions.handleDeleteProvider}
        />

        <ModelRouteSection
          t={t}
          route={controller.state.route}
          routeErrors={controller.state.routeErrors}
          providerOptions={controller.derived.providerOptions}
          selectedProviderModels={controller.derived.selectedProviderModels}
          canConfigureRoute={controller.derived.canConfigureRoute}
          savingRoute={controller.state.savingRoute}
          savingProviders={controller.state.savingProviders}
          onSetDefaultProvider={controller.routeActions.setDefaultProvider}
          onSetPrimaryModel={controller.routeActions.setPrimaryModel}
          onToggleFallbackModel={controller.routeActions.toggleFallbackModel}
          onSaveRoute={controller.routeActions.handleSaveRoute}
        />
      </div>

      <ModelProviderEditorDialog
        t={t}
        providerEditor={controller.state.providerEditor}
        savingProviders={controller.state.savingProviders}
        editorTemplate={controller.derived.editorTemplate}
        editorShowsApiField={controller.derived.editorShowsApiField}
        onCloseEditor={controller.editorActions.closeEditor}
        onSelectCreateProviderType={controller.editorActions.selectCreateProviderType}
        onUpdateProviderEditorDraft={controller.editorActions.updateProviderEditorDraft}
        onSubmitProvider={controller.providerActions.handleProviderSubmit}
      />
    </div>
  )
}

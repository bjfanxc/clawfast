'use client'

import React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import JSON5 from 'json5'
import { CheckCircle2, Copy, FileCode2, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { loadConfigSnapshot } from '@/domain/config/config-service'
import { useGatewayAvailability } from '@/hooks/useGatewayAvailability'
import { useToastStore } from '@/store/toast-store'
import type { ConfigSnapshot } from '../../../shared/config'

function formatUpdatedAt(timestamp?: number | null) {
  if (!timestamp) {
    return '--'
  }

  return new Date(timestamp).toLocaleString()
}

function validateRaw(raw: string | null | undefined) {
  if (!raw) {
    return { ok: true as const }
  }

  try {
    JSON5.parse(raw)
    return { ok: true as const }
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

type ConfigPreviewDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ConfigPreviewDialog({ open, onOpenChange }: ConfigPreviewDialogProps) {
  const { t } = useTranslation()
  const { gatewayConnected, gatewayChecked, refreshGatewayState } = useGatewayAvailability()
  const pushToast = useToastStore((state) => state.pushToast)
  const [loading, setLoading] = React.useState(false)
  const [snapshot, setSnapshot] = React.useState<ConfigSnapshot | null>(null)

  const refresh = React.useCallback(async () => {
    if (!gatewayConnected) {
      return
    }

    setLoading(true)
    try {
      const next = await loadConfigSnapshot()
      setSnapshot(next)
    } catch (error) {
      pushToast('error', `${t('models.loadFailed')}: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
    }
  }, [gatewayConnected, pushToast, t])

  React.useEffect(() => {
    if (!open) {
      return
    }

    if (!gatewayConnected) {
      setSnapshot(null)
      return
    }

    void refresh()
  }, [gatewayConnected, open, refresh])

  const raw = typeof snapshot?.raw === 'string' ? snapshot.raw : JSON5.stringify(snapshot?.config ?? {}, null, 2)
  const validation = validateRaw(raw)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(raw)
      pushToast('success', t('models.previewCopied'))
    } catch (error) {
      pushToast('error', `${t('models.previewCopyFailed')}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="app-overlay-scrim fixed inset-0 z-50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="app-dialog-shell fixed left-1/2 top-1/2 z-50 flex h-[min(82vh,820px)] w-[min(960px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[32px] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="app-dialog-section flex shrink-0 items-start justify-between gap-4 border-b px-6 py-5">
            <div>
              <Dialog.Title className="flex items-center gap-2 text-xl font-semibold text-foreground">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <FileCode2 className="h-4.5 w-4.5" />
                </span>
                {t('models.previewTitle')}
              </Dialog.Title>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="app-soft-button h-12 rounded-2xl px-4"
                onClick={() => void refresh()}
                disabled={loading || !gatewayConnected}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {t('models.refresh')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="app-soft-button h-12 rounded-2xl px-4"
                onClick={() => void handleCopy()}
                disabled={!gatewayConnected}
              >
                <Copy className="mr-2 h-4 w-4" />
                {t('models.previewCopy')}
              </Button>
            </div>
          </div>

          <div className="app-dialog-section grid shrink-0 gap-4 border-b px-6 py-4 md:grid-cols-3">
            <div className="app-dialog-subtle rounded-2xl px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('models.previewStatus')}</div>
              <div className="mt-2 flex items-center gap-2 text-sm text-foreground">
                {validation.ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}
                {validation.ok ? t('models.previewValid') : t('models.previewInvalid')}
              </div>
              {!validation.ok ? <div className="mt-2 text-xs text-destructive">{validation.error}</div> : null}
            </div>

            <div className="app-dialog-subtle rounded-2xl px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('models.previewUpdatedAt')}</div>
              <div className="mt-2 text-sm text-foreground">{formatUpdatedAt(snapshot?.updatedAt)}</div>
            </div>

            <div className="app-dialog-subtle rounded-2xl px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('models.previewHash')}</div>
              <div className="mt-2 truncate font-mono text-sm text-foreground">{snapshot?.hash ?? '--'}</div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden p-6">
            {!gatewayConnected ? (
              <div className="app-dialog-code flex h-full min-h-[260px] flex-col items-center justify-center rounded-[24px] px-6 text-center">
                <div className="text-base font-semibold text-foreground">{t('models.previewTitle')}</div>
                <div className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">
                  {gatewayChecked ? '请先连接 OpenClaw Gateway，再查看当前配置。' : '正在检测 Gateway 连接状态...'}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="app-soft-button mt-6 rounded-2xl"
                  onClick={() => void refreshGatewayState()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  重新检测
                </Button>
              </div>
            ) : (
              <div className="app-dialog-code h-full overflow-auto rounded-[24px]">
                <pre className="min-h-full whitespace-pre-wrap break-words p-5 font-mono text-xs leading-6 text-foreground/90">{raw}</pre>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

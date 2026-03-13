'use client'

import React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import JSON5 from 'json5'
import { CheckCircle2, Copy, FileCode2, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { loadConfigSnapshot } from '@/domain/config/config-service'
import { useGatewayAvailability } from '@/hooks/useGatewayAvailability'
import { cn } from '@/lib/utils'
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
  const { resolvedTheme } = useTheme()
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
  const isDark = resolvedTheme === 'dark'

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
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 dark:bg-slate-950/65" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[82vh] w-[min(960px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[32px] border outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            isDark
              ? 'border-white/10 bg-slate-950 shadow-[0_40px_120px_-36px_rgba(15,23,42,0.95)]'
              : 'border-white/70 bg-white shadow-[0_32px_80px_-30px_rgba(15,23,42,0.35)]'
          )}
        >

          <div className={cn('flex items-start justify-between gap-4 border-b px-6 py-5', isDark ? 'border-white/10' : 'border-slate-200')}>
            <div className="space-y-2">
              <Dialog.Title className={cn('flex items-center gap-2 text-xl font-semibold', isDark ? 'text-white' : 'text-foreground')}>
                <FileCode2 className={cn('h-5 w-5', isDark ? 'text-blue-300' : 'text-blue-600')} />
                {t('models.previewTitle')}
              </Dialog.Title>
              <Dialog.Description className={cn('text-sm', isDark ? 'text-slate-300' : 'text-muted-foreground')}>{t('models.previewHint')}</Dialog.Description>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className={cn(
                  'rounded-2xl',
                  isDark ? 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10' : 'border-slate-200 bg-white text-foreground hover:bg-slate-50'
                )}
                onClick={() => void refresh()}
                disabled={loading || !gatewayConnected}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {t('models.refresh')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  'rounded-2xl',
                  isDark ? 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10' : 'border-slate-200 bg-white text-foreground hover:bg-slate-50'
                )}
                onClick={() => void handleCopy()}
                disabled={!gatewayConnected}
              >
                <Copy className="mr-2 h-4 w-4" />
                {t('models.previewCopy')}
              </Button>
            </div>
          </div>

          <div className={cn('grid gap-4 border-b px-6 py-4 md:grid-cols-3', isDark ? 'border-white/10' : 'border-slate-200')}>
            <div className={cn('rounded-2xl border px-4 py-3', isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50')}>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('models.previewStatus')}</div>
              <div className={cn('mt-2 flex items-center gap-2 text-sm', isDark ? 'text-slate-100' : 'text-foreground')}>
                {validation.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
                {validation.ok ? t('models.previewValid') : t('models.previewInvalid')}
              </div>
              {!validation.ok ? <div className={cn('mt-2 text-xs', isDark ? 'text-red-300' : 'text-red-600')}>{validation.error}</div> : null}
            </div>

            <div className={cn('rounded-2xl border px-4 py-3', isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50')}>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('models.previewUpdatedAt')}</div>
              <div className={cn('mt-2 text-sm', isDark ? 'text-slate-100' : 'text-foreground')}>{formatUpdatedAt(snapshot?.updatedAt)}</div>
            </div>

            <div className={cn('rounded-2xl border px-4 py-3', isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50')}>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('models.previewHash')}</div>
              <div className={cn('mt-2 truncate font-mono text-sm', isDark ? 'text-slate-100' : 'text-foreground')}>{snapshot?.hash ?? '--'}</div>
            </div>
          </div>

          <div className="min-h-0 flex-1 p-6">
            {!gatewayConnected ? (
              <div className={cn('flex h-full min-h-[260px] flex-col items-center justify-center rounded-[24px] border px-6 text-center', isDark ? 'border-white/10 bg-slate-950/70' : 'border-slate-200 bg-slate-50')}>
                <div className={cn('text-base font-semibold', isDark ? 'text-white' : 'text-foreground')}>
                  {t('models.previewTitle')}
                </div>
                <div className={cn('mt-2 max-w-md text-sm leading-7', isDark ? 'text-slate-300' : 'text-muted-foreground')}>
                  {gatewayChecked ? '请先连接 OpenClaw Gateway，再查看当前配置。' : '正在检测 Gateway 连接状态...'}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    'mt-6 rounded-2xl',
                    isDark ? 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10' : 'border-slate-200 bg-white text-foreground hover:bg-slate-50'
                  )}
                  onClick={() => void refreshGatewayState()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  重新检测
                </Button>
              </div>
            ) : (
              <ScrollArea className={cn('h-full rounded-[24px] border', isDark ? 'border-white/10 bg-slate-950/70' : 'border-slate-200 bg-slate-50')}>
                <pre className={cn('min-h-full whitespace-pre-wrap break-words p-5 font-mono text-xs leading-6', isDark ? 'text-slate-200' : 'text-slate-700')}>{raw}</pre>
              </ScrollArea>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

'use client'

import React from 'react'
import { AlertTriangle, Loader2, RefreshCw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type GatewayRequiredStateProps = {
  checking?: boolean
  onRefresh?: () => void
  onDismiss?: () => void
  className?: string
  compact?: boolean
}

export default function GatewayRequiredState({
  checking = false,
  onRefresh,
  onDismiss,
  className,
  compact = false,
}: GatewayRequiredStateProps) {
  const { i18n } = useTranslation()
  const isZh = i18n.language.toLowerCase().startsWith('zh')

  const title = isZh ? '未连接 OpenClaw Gateway' : 'OpenClaw Gateway is not connected'
  const description = isZh
    ? '这是管理端视图。请先确认 Gateway 已启动并连接成功，再进入当前菜单。'
    : 'This view depends on the management gateway. Start or reconnect the gateway before opening this menu.'
  const checkingText = isZh ? '正在检测连接状态...' : 'Checking gateway connection...'
  const refreshText = isZh ? '重新检测' : 'Check Again'
  const dismissText = isZh ? '关闭提示' : 'Dismiss'

  if (compact) {
    return (
      <Card className={cn('rounded-[24px] border-border/80 bg-card/80 shadow-sm', className)}>
        <CardContent className="flex flex-col gap-4 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="app-status-warning flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
                {checking ? <Loader2 className="h-5 w-5 animate-spin" /> : <AlertTriangle className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <div className="text-base font-semibold text-foreground">{title}</div>
                <div className="mt-1 text-sm leading-6 text-muted-foreground">
                  {checking ? checkingText : description}
                </div>
              </div>
            </div>

            {onDismiss ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-2xl text-muted-foreground"
                onClick={onDismiss}
                title={dismissText}
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>

          {onRefresh ? (
            <div className="flex justify-start">
              <Button variant="outline" className="gap-2 rounded-2xl" onClick={onRefresh} disabled={checking}>
                {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {refreshText}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('rounded-[28px] border-border/80 shadow-sm', className)}>
      <CardContent className="flex min-h-[260px] flex-col items-center justify-center px-6 py-12 text-center">
        <div className="app-status-warning flex h-14 w-14 items-center justify-center rounded-2xl">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="mt-5 text-xl font-semibold text-foreground">{title}</div>
        <div className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground">{description}</div>
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {checking ? checkingText : null}
        </div>
        {onRefresh ? (
          <Button variant="outline" className="mt-6 gap-2 rounded-2xl" onClick={onRefresh} disabled={checking}>
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {refreshText}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

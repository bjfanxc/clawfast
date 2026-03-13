'use client'

import React from 'react'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'

const SPLASH_DURATION_MS = 1900
const STATUS_STEP_MS = 560

export default function LaunchSplash() {
  const { i18n } = useTranslation()
  const [visible, setVisible] = React.useState(true)
  const [statusIndex, setStatusIndex] = React.useState(0)

  const isZh = i18n.language.toLowerCase().startsWith('zh')

  const statuses = React.useMemo(
    () =>
      isZh
        ? ['正在启动 ClawFast', '正在连接控制台', '准备 OpenClaw 管理环境']
        : ['Starting ClawFast', 'Connecting console', 'Preparing OpenClaw workspace'],
    [isZh]
  )

  React.useEffect(() => {
    const statusTimer = window.setInterval(() => {
      setStatusIndex((current) => (current + 1) % statuses.length)
    }, STATUS_STEP_MS)

    const closeTimer = window.setTimeout(() => {
      window.clearInterval(statusTimer)
      setVisible(false)
    }, SPLASH_DURATION_MS)

    return () => {
      window.clearInterval(statusTimer)
      window.clearTimeout(closeTimer)
    }
  }, [statuses.length])

  if (!visible) {
    return null
  }

  return (
    <div className="absolute inset-0 z-30 overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,hsl(var(--background)/0.98),hsl(var(--surface-soft)/0.98))] launch-splash-fade dark:bg-[linear-gradient(180deg,hsl(var(--background)/0.98),hsl(var(--surface-soft)/0.98))]">
      <div className="absolute inset-0 launch-splash-grid opacity-60 dark:opacity-40" />
      <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl launch-splash-orb" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-5 px-6 text-center">
          <div className="launch-splash-logo flex h-16 w-16 items-center justify-center overflow-hidden rounded-[24px] shadow-[0_24px_60px_-34px_hsl(var(--primary)/0.32)]">
            <Image src="/images/logo.png" alt="ClawFast" width={64} height={64} className="h-16 w-16 object-cover" priority />
          </div>

          <div className="space-y-2">
            <div className="text-[28px] font-semibold tracking-tight text-foreground">ClawFast</div>
            <div className="launch-splash-status min-h-[24px] text-sm text-muted-foreground">
              {statuses[statusIndex]}
            </div>
          </div>

          <div className="h-px w-28 overflow-hidden rounded-full bg-border/80">
            <div className="launch-splash-line h-full w-1/2 bg-primary/70" />
          </div>
        </div>
      </div>
    </div>
  )
}

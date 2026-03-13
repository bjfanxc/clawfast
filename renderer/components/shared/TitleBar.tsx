'use client'

import React from 'react'
import Image from 'next/image'
import { Minus, Square, X, Moon, Sun, Languages } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export default function TitleBar() {
  const { setTheme, theme, resolvedTheme } = useTheme()
  const { i18n, t } = useTranslation()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleMinimize = () => {
    if (window.ipc) {
      window.ipc.minimize()
    }
  }

  const handleMaximize = () => {
    if (window.ipc) {
      window.ipc.maximize()
    }
  }

  const handleClose = () => {
    if (window.ipc) {
      window.ipc.close()
    }
  }

  const toggleTheme = () => {
    if (theme === 'system') {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
    } else {
      setTheme(theme === 'dark' ? 'light' : 'dark')
    }
  }

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en'
    i18n.changeLanguage(newLang)
  }

  return (
    <div className="draggable app-soft-surface flex h-16 w-full shrink-0 items-center justify-between border-b px-4">
      <div className="flex items-center gap-3 pl-1">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl">
          <Image src="/images/logo.png" alt="ClawFast" width={40} height={40} className="h-10 w-10 object-cover" priority />
        </div>
        <div className="space-y-0.5">
          <div className="text-lg font-semibold tracking-tight">ClawFast</div>
          <div className="text-xs text-muted-foreground">{t('app.tagline')}</div>
        </div>
      </div>
      <div className="no-drag flex h-full items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="app-soft-button h-9 w-9 rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0"
          onClick={toggleLanguage}
        >
          <Languages className="h-4 w-4" />
          <span className="sr-only">{t('common.toggleLanguage')}</span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="app-soft-button h-9 w-9 rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0"
          onClick={toggleTheme}
        >
          {mounted && resolvedTheme === 'dark' ? (
             <Moon className="h-4 w-4" />
          ) : (
             <Sun className="h-4 w-4" />
          )}
          <span className="sr-only">{t('common.toggleTheme')}</span>
        </Button>
        <button
          onClick={handleMinimize}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onClick={handleMaximize}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Square className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleClose}
          className="group flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
        >
          <X className="h-4 w-4 group-hover:text-destructive-foreground" />
        </button>
      </div>
    </div>
  )
}

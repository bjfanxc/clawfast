'use client'

import React from 'react'
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
    <div className="draggable flex h-16 w-full shrink-0 items-center justify-between border-b border-white/60 bg-white/72 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/55">
      <div className="flex items-center gap-3 pl-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(37,99,235,0.9)]">
          CF
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
          className="h-9 w-9 rounded-xl border-white/60 bg-white/60 focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-white/10 dark:bg-white/5"
          onClick={toggleLanguage}
        >
          <Languages className="h-4 w-4" />
          <span className="sr-only">{t('common.toggleLanguage')}</span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-xl border-white/60 bg-white/60 focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-white/10 dark:bg-white/5"
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
          className="group flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-red-500 hover:text-white"
        >
          <X className="h-4 w-4 group-hover:text-white" />
        </button>
      </div>
    </div>
  )
}

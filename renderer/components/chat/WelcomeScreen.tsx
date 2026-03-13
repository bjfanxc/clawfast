'use client'

import React from 'react'
import { MessageSquare, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
import ChatInput from './ChatInput'
import { useTranslation } from 'react-i18next'

export default function WelcomeScreen() {
  const { t } = useTranslation()
  const [isClient, setIsClient] = React.useState(false)

  React.useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) return null

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-blue-600 text-primary-foreground shadow-[0_22px_50px_-28px_rgba(37,99,235,1)]">
            <MessageSquare className="h-8 w-8" />
          </div>
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-muted-foreground dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-300">
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            {t('welcome.badge')}
          </div>
          <h2 className="text-4xl font-bold tracking-tight">
            {t('welcome.title')}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {t('welcome.subtitle')}
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-2">
          <Card className="rounded-[28px] border-border/80 bg-card p-7 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <MessageSquare className="mb-3 h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">{t('welcome.askQuestion.title')}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t('welcome.askQuestion.description')}
            </p>
          </Card>
          <Card className="rounded-[28px] border-border/80 bg-card p-7 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <Sparkles className="mb-3 h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">{t('welcome.creativeTask.title')}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t('welcome.creativeTask.description')}
            </p>
          </Card>
        </div>
      </div>
      
      <div className="w-full shrink-0">
          <ChatInput />
      </div>
    </div>
  )
}

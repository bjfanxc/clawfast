'use client'

import React from 'react'

import { cn } from '@/lib/utils'
import { useToastStore } from '@/store/toast-store'

export default function GlobalToast() {
  const toasts = useToastStore((state) => state.toasts)
  const removeToast = useToastStore((state) => state.removeToast)

  return (
    <div className="pointer-events-none fixed right-6 top-20 z-[70] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => removeToast(toast.id)}
          className={cn(
            'pointer-events-auto w-full rounded-2xl border px-4 py-3 text-left text-sm shadow-lg backdrop-blur-sm transition',
            toast.kind === 'error' &&
              'border-red-200 bg-red-50/95 text-red-700 dark:border-red-900/60 dark:bg-red-950/85 dark:text-red-200',
            toast.kind === 'success' &&
              'border-emerald-200 bg-emerald-50/95 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/85 dark:text-emerald-200',
            toast.kind === 'info' &&
              'border-blue-200 bg-blue-50/95 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/85 dark:text-blue-200'
          )}
        >
          {toast.text}
        </button>
      ))}
    </div>
  )
}

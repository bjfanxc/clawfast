'use client'

import React from 'react'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useToastStore } from '@/store/toast-store'

export default function GlobalToast() {
  const toasts = useToastStore((state) => state.toasts)
  const removeToast = useToastStore((state) => state.removeToast)

  return (
    <div className="pointer-events-none fixed left-1/2 top-20 z-[70] flex w-[min(calc(100%-2rem),28rem)] -translate-x-1/2 flex-col gap-3">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => removeToast(toast.id)}
          className={cn(
            'app-toast pointer-events-auto w-full rounded-2xl px-4 py-3 text-left text-sm shadow-lg transition',
            toast.kind === 'success' &&
              'app-toast-primary',
            toast.kind === 'error' &&
              'app-toast-danger',
            toast.kind === 'info' &&
              'app-toast-info'
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center',
                toast.kind === 'success' && 'text-primary',
                toast.kind === 'error' && 'text-destructive',
                toast.kind === 'info' && 'text-muted-foreground'
              )}
            >
              {toast.kind === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : toast.kind === 'error' ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <Info className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0 flex-1 leading-6">{toast.text}</div>
          </div>
        </button>
      ))}
    </div>
  )
}

'use client'

import { create } from 'zustand'

export type GlobalToastKind = 'success' | 'error' | 'info'

export type GlobalToastItem = {
  id: number
  kind: GlobalToastKind
  text: string
}

type ToastState = {
  toasts: GlobalToastItem[]
  pushToast: (kind: GlobalToastKind, text: string, durationMs?: number) => void
  removeToast: (id: number) => void
  clearToasts: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  pushToast: (kind, text, durationMs = 2400) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    set((state) => ({
      toasts: [...state.toasts, { id, kind, text }],
    }))

    window.setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== id),
      }))
    }, durationMs)
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}))

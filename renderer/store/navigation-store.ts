import { create } from 'zustand'

export type AppView = 'chat' | 'dashboard' | 'skills' | 'channels' | 'sessions' | 'cron' | 'usage' | 'models'

interface NavigationState {
  currentView: AppView
  sidebarCollapsed: boolean
  setCurrentView: (view: AppView) => void
  toggleSidebarCollapsed: () => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentView: 'dashboard',
  sidebarCollapsed: false,
  setCurrentView: (view) => set({ currentView: view }),
  toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}))

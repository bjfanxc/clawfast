import { create } from 'zustand'

type SessionsSyncState = {
  refreshSignal: number
  requestRefresh: () => void
}

export const useSessionsSyncStore = create<SessionsSyncState>((set) => ({
  refreshSignal: 0,
  requestRefresh: () => set((state) => ({ refreshSignal: state.refreshSignal + 1 })),
}))

import { create } from 'zustand'

type ChatUiSyncState = {
  userSentSignal: number
  assistantActivitySignal: number
  notifyUserSent: () => void
  notifyAssistantActivity: () => void
}

export const useChatUiSyncStore = create<ChatUiSyncState>((set) => ({
  userSentSignal: 0,
  assistantActivitySignal: 0,
  notifyUserSent: () => set((state) => ({ userSentSignal: state.userSentSignal + 1 })),
  notifyAssistantActivity: () => set((state) => ({ assistantActivitySignal: state.assistantActivitySignal + 1 })),
}))

import { create } from 'zustand'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  status?: 'sending' | 'sent' | 'error'
  error?: string | null
  runId?: string | null
}

export interface Session {
  id: string
  title: string
  messages: Message[]
  updatedAt: number
}

interface ChatState {
  sessions: Session[]
  currentSessionId: string | null
  createSession: () => string
  ensureSession: (session: Pick<Session, 'id' | 'title' | 'updatedAt'>) => void
  replaceSessionMessages: (sessionId: string, messages: Message[]) => void
  addMessage: (sessionId: string, message: Message) => void
  updateLastMessage: (sessionId: string, content: string | ((prev: string) => string)) => void
  updateMessage: (sessionId: string, messageId: string, patch: Partial<Message>) => void
  setCurrentSession: (id: string) => void
}

const initialSessionId = 'session-1'

export const useChatStore = create<ChatState>((set) => ({
  sessions: [
    {
      id: initialSessionId,
      title: 'New Chat',
      messages: [],
      updatedAt: Date.now(),
    },
  ],
  currentSessionId: initialSessionId,
  createSession: () => {
    const sessionId = `session-${Date.now()}`
    set((state) => {
      const newSession: Session = {
        id: sessionId,
        title: 'New Chat',
        messages: [],
        updatedAt: Date.now(),
      }

      return {
        sessions: [newSession, ...state.sessions],
        currentSessionId: sessionId,
      }
    })

    return sessionId
  },
  ensureSession: (session) =>
    set((state) => {
      const existing = state.sessions.find((item) => item.id === session.id)

      if (existing) {
        return {
          sessions: state.sessions
            .map((item) =>
              item.id === session.id
                ? {
                    ...item,
                    title: session.title || item.title,
                    updatedAt: session.updatedAt || item.updatedAt,
                  }
                : item
            )
            .sort((left, right) => right.updatedAt - left.updatedAt),
          currentSessionId: session.id,
        }
      }

      const nextSession: Session = {
        id: session.id,
        title: session.title,
        updatedAt: session.updatedAt,
        messages: [],
      }

      return {
        sessions: [nextSession, ...state.sessions].sort((left, right) => right.updatedAt - left.updatedAt),
        currentSessionId: session.id,
      }
    }),
  replaceSessionMessages: (sessionId, messages) =>
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messages,
              updatedAt: messages[messages.length - 1]?.timestamp ?? session.updatedAt,
            }
          : session
      ),
    })),
  addMessage: (sessionId, message) =>
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId
          ? { ...session, messages: [...session.messages, message], updatedAt: Date.now() }
          : session
      ),
    })),
  updateLastMessage: (sessionId, contentOrUpdater) =>
    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id !== sessionId || session.messages.length === 0) return session

        const lastMessage = session.messages[session.messages.length - 1]
        if (lastMessage.role !== 'assistant') return session

        const nextContent = typeof contentOrUpdater === 'function'
          ? contentOrUpdater(lastMessage.content)
          : contentOrUpdater

        const messages = [...session.messages]
        messages[messages.length - 1] = {
          ...lastMessage,
          content: nextContent,
        }

        return {
          ...session,
          messages,
          updatedAt: Date.now(),
        }
      }),
    })),
  updateMessage: (sessionId, messageId, patch) =>
    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id !== sessionId) return session

        return {
          ...session,
          updatedAt: Date.now(),
          messages: session.messages.map((message) =>
            message.id === messageId
              ? { ...message, ...patch }
              : message
          ),
        }
      }),
    })),
  setCurrentSession: (id) => set({ currentSessionId: id }),
}))

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
  appendMessageContent: (sessionId: string, messageId: string, content: string) => void
  setCurrentSession: (id: string) => void
}

const initialSessionId = 'session-1'

function sortSessionsByUpdatedAt(sessions: Session[]) {
  return [...sessions].sort((left, right) => right.updatedAt - left.updatedAt)
}

function updateSessionById(
  sessions: Session[],
  sessionId: string,
  updater: (session: Session) => Session,
  sortAfterUpdate = false
) {
  let changed = false
  const nextSessions = sessions.map((session) => {
    if (session.id !== sessionId) return session
    const nextSession = updater(session)
    if (nextSession !== session) {
      changed = true
    }
    return nextSession
  })
  if (sortAfterUpdate && changed) {
    return sortSessionsByUpdatedAt(nextSessions)
  }
  return nextSessions
}

function updateSessionMessages(
  sessions: Session[],
  sessionId: string,
  updater: (messages: Message[], session: Session) => Message[]
) {
  return updateSessionById(sessions, sessionId, (session) => {
    const nextMessages = updater(session.messages, session)
    if (nextMessages === session.messages) {
      return session
    }
    return {
      ...session,
      updatedAt: Date.now(),
      messages: nextMessages,
    }
  }, true)
}

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
        sessions: sortSessionsByUpdatedAt([newSession, ...state.sessions]),
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
          sessions: sortSessionsByUpdatedAt(
            state.sessions
            .map((item) =>
              item.id === session.id
                ? {
                    ...item,
                    title: session.title || item.title,
                    updatedAt: session.updatedAt || item.updatedAt,
                  }
                : item
            )
          ),
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
        sessions: sortSessionsByUpdatedAt([nextSession, ...state.sessions]),
        currentSessionId: session.id,
      }
    }),
  replaceSessionMessages: (sessionId, messages) =>
    set((state) => ({
      sessions: updateSessionById(state.sessions, sessionId, (session) => ({
        ...session,
        messages,
        updatedAt: messages[messages.length - 1]?.timestamp ?? session.updatedAt,
      }), true),
    })),
  addMessage: (sessionId, message) =>
    set((state) => ({
      sessions: updateSessionMessages(state.sessions, sessionId, (messages) => [...messages, message]),
    })),
  updateLastMessage: (sessionId, contentOrUpdater) =>
    set((state) => ({
      sessions: updateSessionById(state.sessions, sessionId, (session) => {
        if (session.messages.length === 0) return session

        const lastMessage = session.messages[session.messages.length - 1]
        if (lastMessage.role !== 'assistant') return session

        const nextContent = typeof contentOrUpdater === 'function'
          ? contentOrUpdater(lastMessage.content)
          : contentOrUpdater
        if (nextContent === lastMessage.content) return session

        const messages = [...session.messages]
        messages[messages.length - 1] = {
          ...lastMessage,
          content: nextContent,
        }

        return {
          ...session,
          updatedAt: Date.now(),
          messages,
        }
      }, true),
    })),
  updateMessage: (sessionId, messageId, patch) =>
    set((state) => ({
      sessions: updateSessionMessages(state.sessions, sessionId, (messages) =>
        {
          const index = messages.findIndex((message) => message.id === messageId)
          if (index < 0) return messages
          const nextMessages = [...messages]
          nextMessages[index] = { ...nextMessages[index], ...patch }
          return nextMessages
        }
      ),
    })),
  appendMessageContent: (sessionId, messageId, content) =>
    set((state) => ({
      sessions: updateSessionMessages(state.sessions, sessionId, (messages) =>
        {
          if (!content) return messages
          const index = messages.findIndex((message) => message.id === messageId)
          if (index < 0) return messages
          const nextMessages = [...messages]
          const currentMessage = nextMessages[index]
          nextMessages[index] = { ...currentMessage, content: `${currentMessage.content}${content}` }
          return nextMessages
        }
      ),
    })),
  setCurrentSession: (id) => set({ currentSessionId: id }),
}))

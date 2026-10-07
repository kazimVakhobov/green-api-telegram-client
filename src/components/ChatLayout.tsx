import { useEffect, useReducer, useState } from 'react'

import type { InstanceCredentials } from '../api/types'
import { chatsReducer, initialChatsState } from '../store/chatsReducer'
import { loadChats, saveChats } from '../store/persistence'
import { ChatList } from './ChatList'
import { Conversation } from './Conversation'
import { StartChatForm } from './StartChatForm'
import styles from './ChatLayout.module.css'

interface ChatLayoutProps {
  credentials: InstanceCredentials
  onLogout: () => void
}

export function ChatLayout({ credentials, onLogout }: ChatLayoutProps) {
  const [state, dispatch] = useReducer(
    chatsReducer,
    credentials.idInstance,
    (idInstance) => ({ ...initialChatsState, chats: loadChats(idInstance) }),
  )
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    saveChats(credentials.idInstance, state.chats)
  }, [credentials.idInstance, state.chats])

  const activeChat =
    state.chats.find((chat) => chat.id === state.activeChatId) ?? null

  function handleStart(phone: string, title: string | null) {
    dispatch({ type: 'chatStarted', phone, title, timestamp: Date.now() })
    setStarting(false)
  }

  function handleSend(text: string) {
    if (activeChat === null) return

    dispatch({
      type: 'messageQueued',
      chatId: activeChat.id,
      localId: `local-${crypto.randomUUID()}`,
      text,
      timestamp: Date.now(),
    })
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <header className={styles.header}>
          <span className={styles.instance}>
            Инстанс {credentials.idInstance}
          </span>
          <button
            className={styles.action}
            type="button"
            onClick={() => setStarting((open) => !open)}
          >
            {starting ? 'Закрыть' : 'Новый чат'}
          </button>
          <button className={styles.action} type="button" onClick={onLogout}>
            Выйти
          </button>
        </header>

        {starting && (
          <StartChatForm
            onStart={handleStart}
            onCancel={() => setStarting(false)}
          />
        )}

        <div className={styles.chats}>
          <ChatList
            chats={state.chats}
            activeChatId={state.activeChatId}
            onSelect={(chatId) => dispatch({ type: 'chatOpened', chatId })}
          />
        </div>
      </aside>

      {activeChat === null ? (
        <div className={styles.placeholder}>
          <span className={styles.hint}>Выберите чат или начните новый</span>
        </div>
      ) : (
        <Conversation chat={activeChat} onSend={handleSend} />
      )}
    </div>
  )
}

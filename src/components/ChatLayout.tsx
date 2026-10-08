import { useEffect, useMemo, useReducer, useState } from 'react'

import { createGreenApiClient, GreenApiError } from '../api/greenApi'
import type { InstanceCredentials } from '../api/types'
import {
  chatsReducer,
  initialChatsState,
  sendTarget,
} from '../store/chatsReducer'
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
  const client = useMemo(() => createGreenApiClient(credentials), [credentials])

  useEffect(() => {
    saveChats(credentials.idInstance, state.chats)
  }, [credentials.idInstance, state.chats])

  const activeChat =
    state.chats.find((chat) => chat.id === state.activeChatId) ?? null

  function handleStart(phone: string, title: string | null) {
    dispatch({ type: 'chatStarted', phone, title, timestamp: Date.now() })
    setStarting(false)
  }

  async function handleSend(text: string) {
    if (activeChat === null) return

    const chatId = activeChat.id
    const target = sendTarget(activeChat)
    // Пузырь появляется сразу, до ответа API: иначе кажется, что ввод завис.
    const localId = `local-${crypto.randomUUID()}`

    dispatch({
      type: 'messageQueued',
      chatId,
      localId,
      text,
      timestamp: Date.now(),
    })

    if (target === null) {
      dispatch({
        type: 'messageFailed',
        chatId,
        localId,
        reason: 'У чата нет ни номера, ни chatId — отправлять некуда',
      })
      return
    }

    try {
      const idMessage = await client.sendMessage(target, text)
      dispatch({ type: 'messageSent', chatId, localId, idMessage })
    } catch (error) {
      dispatch({
        type: 'messageFailed',
        chatId,
        localId,
        reason:
          error instanceof GreenApiError
            ? error.message
            : 'Не удалось отправить сообщение',
      })
    }
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

import { useEffect, useRef } from 'react'

import { formatPhone } from '../lib/phoneNumber'
import type { Chat } from '../store/types'
import { Bubble } from './Bubble'
import { ChatAvatar } from './ChatAvatar'
import { Composer } from './Composer'
import styles from './Conversation.module.css'

interface ConversationProps {
  chat: Chat
  onSend: (text: string) => void
  onBack: () => void
}

export function Conversation({ chat, onSend, onBack }: ConversationProps) {
  const history = useRef<HTMLDivElement>(null)

  // Прокрутка вниз при смене чата и на каждое новое сообщение.
  useEffect(() => {
    const element = history.current
    if (element === null) return

    element.scrollTop = element.scrollHeight
  }, [chat.id, chat.messages.length])

  const subtitle = chat.phone === null ? chat.apiChatId : formatPhone(chat.phone)

  return (
    <section className={styles.conversation}>
      <header className={styles.header}>
        <button
          className={styles.back}
          type="button"
          onClick={onBack}
          aria-label="К списку чатов"
        >
          ‹
        </button>
        <ChatAvatar
          title={chat.title}
          seed={chat.id}
          className={styles.avatar}
        />
        <div className={styles.about}>
          <h2 className={styles.title}>{chat.title}</h2>
          {subtitle !== null && (
            <p className={styles.subtitle}>{subtitle}</p>
          )}
        </div>
      </header>

      <div className={styles.history} ref={history}>
        {chat.messages.length === 0 ? (
          <p className={styles.empty}>
            Сообщений пока нет. Напишите первым — ответ придёт сюда же.
          </p>
        ) : (
          <div className={styles.messages}>
            {chat.messages.map((message) => (
              <Bubble key={message.id} message={message} />
            ))}
          </div>
        )}
      </div>

      <Composer onSend={onSend} />
    </section>
  )
}

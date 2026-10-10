import { formatTime } from '../lib/time'
import type { Chat } from '../store/types'
import { ChatAvatar } from './ChatAvatar'
import styles from './ChatList.module.css'

function preview(chat: Chat): string {
  const last = chat.messages.at(-1)
  if (last === undefined) return 'Сообщений пока нет'

  return last.direction === 'out' ? `Вы: ${last.text}` : last.text
}

interface ChatListProps {
  chats: Chat[]
  activeChatId: string | null
  onSelect: (chatId: string) => void
}

export function ChatList({ chats, activeChatId, onSelect }: ChatListProps) {
  if (chats.length === 0) {
    return (
      <p className={styles.empty}>
        Чатов пока нет. Начните переписку по номеру телефона.
      </p>
    )
  }

  return (
    <ul className={styles.list}>
      {chats.map((chat) => {
        const last = chat.messages.at(-1)

        return (
          <li key={chat.id}>
            <button
              type="button"
              className={`${styles.row} ${chat.id === activeChatId ? styles.active : ''}`}
              onClick={() => onSelect(chat.id)}
            >
              <ChatAvatar title={chat.title} seed={chat.id} />
              <span className={styles.body}>
                <span className={styles.line}>
                  <span className={styles.title}>{chat.title}</span>
                  {last !== undefined && (
                    <span className={styles.time}>
                      {formatTime(last.timestamp)}
                    </span>
                  )}
                </span>
                <span className={styles.preview}>{preview(chat)}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

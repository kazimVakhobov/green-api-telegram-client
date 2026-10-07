/**
 * В модели два разных идентификатора чата, и путать их нельзя:
 *
 * - `Chat.id` — наш ключ. Это нормализованный номер телефона, потому что чат
 *   заводится именно по номеру, задолго до первого ответа.
 * - `Chat.apiChatId` — числовой `chatId` Telegram из уведомления. Нужен не для
 *   отправки, а чтобы узнать свой чат во входящих, когда номер отправителя
 *   скрыт настройками приватности.
 */

export type MessageStatus = 'pending' | 'sent' | 'failed'

interface MessageBase {
  /** До ответа sendMessage — временный локальный id, потом `idMessage`. */
  id: string
  text: string
  timestamp: number
}

export interface IncomingMessage extends MessageBase {
  direction: 'in'
}

export interface OutgoingMessage extends MessageBase {
  direction: 'out'
  status: MessageStatus
}

export type Message = IncomingMessage | OutgoingMessage

export interface Chat {
  id: string
  phone: string | null
  apiChatId: string | null
  title: string
  messages: Message[]
  updatedAt: number
}

export interface ChatsState {
  chats: Chat[]
  activeChatId: string | null
}

/** Уведомление после разбора — ровно то, что от него нужно модели чатов. */
export interface ReceivedMessage {
  /** `out` — сообщение, отправленное из приложения Telegram, а не отсюда. */
  direction: 'in' | 'out'
  idMessage: string
  text: string
  timestamp: number
  phone: string | null
  apiChatId: string | null
  senderName: string | null
}

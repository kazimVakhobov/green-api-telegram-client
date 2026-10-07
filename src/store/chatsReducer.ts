import { formatPhone } from '../lib/phoneNumber'
import type {
  Chat,
  ChatsState,
  Message,
  OutgoingMessage,
  ReceivedMessage,
} from './types'

export const initialChatsState: ChatsState = {
  chats: [],
  activeChatId: null,
}

export type ChatsAction =
  | {
      type: 'chatStarted'
      phone: string
      title: string | null
      timestamp: number
    }
  | { type: 'chatOpened'; chatId: string }
  | {
      type: 'messageQueued'
      chatId: string
      localId: string
      text: string
      timestamp: number
    }
  | { type: 'messageSent'; chatId: string; localId: string; idMessage: string }
  | { type: 'messageFailed'; chatId: string; localId: string }
  | { type: 'messageReceived'; message: ReceivedMessage }

/** Чат с новым сообщением уезжает наверх списка — как в Telegram. */
function moveToTop(chats: Chat[], updated: Chat): Chat[] {
  return [updated, ...chats.filter((chat) => chat.id !== updated.id)]
}

function replaceChat(chats: Chat[], updated: Chat): Chat[] {
  return chats.map((chat) => (chat.id === updated.id ? updated : chat))
}

function patchOutgoing(
  state: ChatsState,
  chatId: string,
  localId: string,
  patch: (message: OutgoingMessage) => OutgoingMessage,
): ChatsState {
  const chat = state.chats.find((item) => item.id === chatId)
  if (chat === undefined) return state

  let found = false
  const messages = chat.messages.map((message) => {
    if (message.id !== localId || message.direction !== 'out') return message
    found = true
    return patch(message)
  })

  if (!found) return state

  return { ...state, chats: replaceChat(state.chats, { ...chat, messages }) }
}

function hasMessage(state: ChatsState, idMessage: string): boolean {
  return state.chats.some((chat) =>
    chat.messages.some((message) => message.id === idMessage),
  )
}

/**
 * Сначала по числовому id — он точный. Номер отправителя идёт вторым: по нему
 * узнаём чат, который завели вручную и в котором ответа ещё не было.
 */
function matchChat(
  state: ChatsState,
  message: ReceivedMessage,
): Chat | undefined {
  if (message.apiChatId !== null) {
    const byApiChatId = state.chats.find(
      (chat) => chat.apiChatId === message.apiChatId,
    )
    if (byApiChatId !== undefined) return byApiChatId
  }

  if (message.phone !== null) {
    return state.chats.find((chat) => chat.phone === message.phone)
  }

  return undefined
}

function toMessage(received: ReceivedMessage): Message {
  const base = {
    id: received.idMessage,
    text: received.text,
    timestamp: received.timestamp,
  }

  return received.direction === 'in'
    ? { ...base, direction: 'in' }
    : { ...base, direction: 'out', status: 'sent' }
}

export function chatsReducer(
  state: ChatsState,
  action: ChatsAction,
): ChatsState {
  switch (action.type) {
    case 'chatStarted': {
      const existing = state.chats.find((chat) => chat.phone === action.phone)
      if (existing !== undefined) {
        return { ...state, activeChatId: existing.id }
      }

      const chat: Chat = {
        id: action.phone,
        phone: action.phone,
        apiChatId: null,
        title: action.title?.trim() || formatPhone(action.phone),
        messages: [],
        updatedAt: action.timestamp,
      }

      return { chats: [chat, ...state.chats], activeChatId: chat.id }
    }

    case 'chatOpened':
      return { ...state, activeChatId: action.chatId }

    case 'messageQueued': {
      const chat = state.chats.find((item) => item.id === action.chatId)
      if (chat === undefined) return state

      const message: OutgoingMessage = {
        id: action.localId,
        direction: 'out',
        text: action.text,
        timestamp: action.timestamp,
        status: 'pending',
      }

      const updated: Chat = {
        ...chat,
        messages: [...chat.messages, message],
        updatedAt: action.timestamp,
      }

      return { ...state, chats: moveToTop(state.chats, updated) }
    }

    /** Локальный id меняем на `idMessage`: по нему потом ловим эхо отправки. */
    case 'messageSent':
      return patchOutgoing(state, action.chatId, action.localId, (message) => ({
        ...message,
        id: action.idMessage,
        status: 'sent',
      }))

    case 'messageFailed':
      return patchOutgoing(state, action.chatId, action.localId, (message) => ({
        ...message,
        status: 'failed',
      }))

    case 'messageReceived': {
      const received = action.message

      // На свою же отправку приходит эхо с тем же idMessage. Ищем по всем
      // чатам: сопоставление могло ошибиться, а задвоение заметнее пропажи.
      if (hasMessage(state, received.idMessage)) return state

      const existing = matchChat(state, received)
      const id = existing?.id ?? received.phone ?? received.apiChatId
      if (id === null) return state

      const chat: Chat = existing ?? {
        id,
        phone: received.phone,
        apiChatId: received.apiChatId,
        title:
          received.senderName ??
          (received.phone === null ? id : formatPhone(received.phone)),
        messages: [],
        updatedAt: received.timestamp,
      }

      const updated: Chat = {
        ...chat,
        // Первое входящее приносит числовой chatId — запоминаем его навсегда.
        apiChatId: chat.apiChatId ?? received.apiChatId,
        messages: [...chat.messages, toMessage(received)],
        updatedAt: Math.max(chat.updatedAt, received.timestamp),
      }

      return { ...state, chats: moveToTop(state.chats, updated) }
    }
  }
}

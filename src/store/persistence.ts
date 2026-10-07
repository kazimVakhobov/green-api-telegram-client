import type { InstanceCredentials } from '../api/types'
import type { Chat, Message, MessageStatus } from './types'

const CREDENTIALS_KEY = 'green-api-telegram-client:credentials'

/** Переписка принадлежит инстансу: со сменой учётных данных она не мешается. */
function chatsKey(idInstance: string): string {
  return `green-api-telegram-client:chats:${idInstance}`
}

/**
 * localStorage бросает исключения чаще, чем кажется: приватный режим Safari,
 * отключённые сайтовые данные, переполненная квота. Хранилище здесь
 * необязательное — при любой осечке просто живём без сохранённого состояния.
 */
function readRaw(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}

function writeRaw(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Молча: потеря сохранения не повод ломать интерфейс.
  }
}

function removeRaw(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // см. выше
  }
}

function asCredentials(value: unknown): InstanceCredentials | null {
  if (typeof value !== 'object' || value === null) return null

  const { apiUrl, idInstance, apiTokenInstance } = value as Record<
    string,
    unknown
  >

  if (
    typeof apiUrl !== 'string' ||
    typeof idInstance !== 'string' ||
    typeof apiTokenInstance !== 'string'
  ) {
    return null
  }

  if (!idInstance || !apiTokenInstance) return null

  return { apiUrl, idInstance, apiTokenInstance }
}

/**
 * Токен инстанса лежит в localStorage в открытом виде. Для тестового задания это
 * осознанный компромисс: иначе учётные данные пришлось бы вводить после каждой
 * перезагрузки. В реальном сервисе запросы к GREEN-API шли бы через свой бэкенд,
 * а токен не попадал бы в браузер вообще.
 */
export function loadCredentials(): InstanceCredentials | null {
  return asCredentials(readRaw(CREDENTIALS_KEY))
}

export function saveCredentials(credentials: InstanceCredentials): void {
  writeRaw(CREDENTIALS_KEY, credentials)
}

export function clearCredentials(): void {
  removeRaw(CREDENTIALS_KEY)
}

function asMessage(value: unknown): Message | null {
  if (typeof value !== 'object' || value === null) return null

  const { id, direction, text, timestamp, status } = value as Record<
    string,
    unknown
  >

  if (
    typeof id !== 'string' ||
    !id ||
    typeof text !== 'string' ||
    typeof timestamp !== 'number'
  ) {
    return null
  }

  if (direction === 'in') return { id, direction, text, timestamp }
  if (direction !== 'out') return null

  // `pending` после перезагрузки недостижим: запрос на отправку умер вместе со
  // страницей, и подтверждения уже не будет. Честнее показать неудачу.
  const restored: MessageStatus = status === 'sent' ? 'sent' : 'failed'
  return { id, direction, text, timestamp, status: restored }
}

function asChat(value: unknown): Chat | null {
  if (typeof value !== 'object' || value === null) return null

  const { id, phone, apiChatId, title, messages, updatedAt } = value as Record<
    string,
    unknown
  >

  if (typeof id !== 'string' || !id) return null
  if (typeof title !== 'string') return null
  if (typeof updatedAt !== 'number') return null
  if (phone !== null && typeof phone !== 'string') return null
  if (apiChatId !== null && typeof apiChatId !== 'string') return null

  return {
    id,
    phone,
    apiChatId,
    title,
    updatedAt,
    messages: Array.isArray(messages)
      ? messages
          .map(asMessage)
          .filter((message): message is Message => message !== null)
      : [],
  }
}

export function loadChats(idInstance: string): Chat[] {
  const stored = readRaw(chatsKey(idInstance))
  if (!Array.isArray(stored)) return []

  return stored.map(asChat).filter((chat): chat is Chat => chat !== null)
}

export function saveChats(idInstance: string, chats: Chat[]): void {
  writeRaw(chatsKey(idInstance), chats)
}

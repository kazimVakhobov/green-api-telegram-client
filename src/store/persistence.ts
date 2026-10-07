import type { InstanceCredentials } from '../api/types'

const CREDENTIALS_KEY = 'green-api-telegram-client:credentials'

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

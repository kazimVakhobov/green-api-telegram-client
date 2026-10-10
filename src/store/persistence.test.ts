import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearCredentials,
  loadChats,
  loadCredentials,
  saveChats,
  saveCredentials,
} from './persistence'
import type { Chat } from './types'

const KEY = 'green-api-telegram-client:credentials'
const CHATS_KEY = 'green-api-telegram-client:chats:4100000000'

const credentials = {
  apiUrl: 'https://api.green-api.com',
  idInstance: '4100000000',
  apiTokenInstance: 'secret-token',
}

function fakeStorage(entries: Record<string, string> = {}) {
  const items = new Map(Object.entries(entries))
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value)
    },
    removeItem: (key: string) => {
      items.delete(key)
    },
  }
}

function useStorage(storage: unknown) {
  vi.stubGlobal('localStorage', storage)
}

beforeEach(() => {
  useStorage(fakeStorage())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('учётные данные в localStorage', () => {
  it('сохраняются и читаются обратно', () => {
    saveCredentials(credentials)
    expect(loadCredentials()).toEqual(credentials)
  })

  it('на пустом хранилище дают null', () => {
    expect(loadCredentials()).toBeNull()
  })

  it('забываются после выхода', () => {
    saveCredentials(credentials)
    clearCredentials()
    expect(loadCredentials()).toBeNull()
  })
})

describe('испорченное хранилище', () => {
  it('мусор вместо JSON не ломает чтение', () => {
    useStorage(fakeStorage({ [KEY]: 'не json' }))
    expect(loadCredentials()).toBeNull()
  })

  it('объект без нужных полей отбрасывается', () => {
    useStorage(fakeStorage({ [KEY]: JSON.stringify({ apiUrl: 'x' }) }))
    expect(loadCredentials()).toBeNull()
  })

  it('числовой idInstance из чужой версии формата отбрасывается', () => {
    useStorage(
      fakeStorage({
        [KEY]: JSON.stringify({ ...credentials, idInstance: 4100000000 }),
      }),
    )
    expect(loadCredentials()).toBeNull()
  })

  it('пустой токен считается отсутствием учётных данных', () => {
    useStorage(
      fakeStorage({
        [KEY]: JSON.stringify({ ...credentials, apiTokenInstance: '' }),
      }),
    )
    expect(loadCredentials()).toBeNull()
  })
})

const chat: Chat = {
  id: '79991234567',
  phone: '79991234567',
  apiChatId: '10000000',
  title: 'Василиса',
  updatedAt: 2000,
  messages: [
    { id: 'ID-1', direction: 'in', text: 'привет', timestamp: 2000 },
    {
      id: 'ID-2',
      direction: 'out',
      text: 'и тебе',
      timestamp: 2100,
      status: 'sent',
    },
  ],
}

describe('переписка в localStorage', () => {
  it('сохраняется и читается обратно', () => {
    saveChats('4100000000', [chat])
    expect(loadChats('4100000000')).toEqual([chat])
  })

  it('принадлежит своему инстансу', () => {
    saveChats('4100000000', [chat])
    expect(loadChats('4109999999')).toEqual([])
  })

  it('на пустом хранилище даёт пустой список', () => {
    expect(loadChats('4100000000')).toEqual([])
  })

  it('недоотправленное после перезагрузки становится неудачей', () => {
    saveChats('4100000000', [
      {
        ...chat,
        messages: [
          {
            id: 'local-1',
            direction: 'out',
            text: 'как дела',
            timestamp: 2200,
            status: 'pending',
          },
        ],
      },
    ])

    expect(loadChats('4100000000')[0]?.messages[0]).toMatchObject({
      status: 'failed',
    })
  })

  it('причина неудачи переживает перезагрузку', () => {
    saveChats('4100000000', [
      {
        ...chat,
        messages: [
          {
            id: 'ID-3',
            direction: 'out',
            text: 'не ушло',
            timestamp: 2300,
            status: 'failed',
            error: 'Исчерпан лимит запросов на тарифе',
          },
        ],
      },
    ])

    expect(loadChats('4100000000')[0]?.messages[0]).toMatchObject({
      error: 'Исчерпан лимит запросов на тарифе',
    })
  })

  it('битые записи выбрасываются, целые остаются', () => {
    useStorage(
      fakeStorage({
        [CHATS_KEY]: JSON.stringify([
          chat,
          { id: 'без заголовка' },
          'строка вместо чата',
          null,
        ]),
      }),
    )

    expect(loadChats('4100000000')).toEqual([chat])
  })

  it('битое сообщение не утаскивает за собой весь чат', () => {
    useStorage(
      fakeStorage({
        [CHATS_KEY]: JSON.stringify([
          { ...chat, messages: [{ id: 'ID-1' }, chat.messages[1]] },
        ]),
      }),
    )

    expect(loadChats('4100000000')[0]?.messages).toEqual([chat.messages[1]])
  })
})

describe('хранилище недоступно', () => {
  it('чтение в приватном режиме отдаёт null, а не исключение', () => {
    useStorage({
      getItem: () => {
        throw new DOMException('denied', 'SecurityError')
      },
    })
    expect(loadCredentials()).toBeNull()
  })

  it('переполненная квота не ломает сохранение', () => {
    useStorage({
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError')
      },
    })
    expect(() => saveCredentials(credentials)).not.toThrow()
  })
})

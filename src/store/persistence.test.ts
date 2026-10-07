import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearCredentials,
  loadCredentials,
  saveCredentials,
} from './persistence'

const KEY = 'green-api-telegram-client:credentials'

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

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createGreenApiClient, GreenApiError } from './greenApi'
import type { InstanceCredentials } from './types'

const credentials: InstanceCredentials = {
  // Лишние пробелы и слеш — то, что реально приносит копипаста из консоли.
  apiUrl: 'https://api.green-api.com/',
  idInstance: ' 4100000000 ',
  apiTokenInstance: ' secret-token ',
}

type Responder = (url: string, init?: RequestInit) => Response | Promise<never>

function stubFetch(responder: Responder) {
  const spy = vi.fn((url: string, init?: RequestInit) => {
    const result = responder(url, init)
    return result instanceof Response ? Promise.resolve(result) : result
  })
  vi.stubGlobal('fetch', spy)
  return spy
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('адрес запроса', () => {
  it('собирается из учётных данных, лишние пробелы и слеш отбрасываются', async () => {
    const fetchSpy = stubFetch(() => json({ stateInstance: 'authorized' }))
    const client = createGreenApiClient(credentials)

    await expect(client.getStateInstance()).resolves.toBe('authorized')
    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      'https://api.green-api.com/waInstance4100000000/getStateInstance/secret-token',
    )
  })

  it('подставляет receiptId в путь deleteNotification и шлёт DELETE', async () => {
    const fetchSpy = stubFetch(() => json({ result: true }))
    const client = createGreenApiClient(credentials)

    await client.deleteNotification(42)

    const [url, init] = fetchSpy.mock.calls[0] ?? []
    expect(url).toBe(
      'https://api.green-api.com/waInstance4100000000/deleteNotification/secret-token/42',
    )
    expect(init?.method).toBe('DELETE')
  })
})

describe('sendMessage', () => {
  it('отправляет chatId и текст телом POST, возвращает idMessage', async () => {
    const fetchSpy = stubFetch(() => json({ idMessage: 'BAE5F4886F6F2D05' }))
    const client = createGreenApiClient(credentials)

    await expect(client.sendMessage('79991234567@c.us', 'привет')).resolves.toBe(
      'BAE5F4886F6F2D05',
    )

    const init = fetchSpy.mock.calls[0]?.[1]
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      chatId: '79991234567@c.us',
      message: 'привет',
    })
  })
})

describe('receiveNotification', () => {
  it('зажимает таймаут в допустимые 5–60 секунд', async () => {
    const fetchSpy = stubFetch(() => new Response('', { status: 200 }))
    const client = createGreenApiClient(credentials)

    await client.receiveNotification(1)
    await client.receiveNotification(120)
    await client.receiveNotification(20)

    const timeouts = fetchSpy.mock.calls.map(
      ([url]) => new URL(url).searchParams.get('receiveTimeout'),
    )
    expect(timeouts).toEqual(['5', '60', '20'])
  })

  it('отдаёт null, когда очередь пуста', async () => {
    stubFetch(() => new Response('', { status: 200 }))
    const client = createGreenApiClient(credentials)

    await expect(client.receiveNotification(5)).resolves.toBeNull()
  })

  it('отдаёт null и на строку null в теле ответа', async () => {
    stubFetch(() => new Response('null', { status: 200 }))
    const client = createGreenApiClient(credentials)

    await expect(client.receiveNotification(5)).resolves.toBeNull()
  })

  it('возвращает уведомление вместе с receiptId', async () => {
    stubFetch(() =>
      json({
        receiptId: 7,
        body: {
          typeWebhook: 'incomingMessageReceived',
          idMessage: '1763115112345',
          senderData: { chatId: '10000000', senderPhoneNumber: 79998887766 },
          messageData: {
            typeMessage: 'textMessage',
            textMessageData: { textMessage: 'привет' },
          },
        },
      }),
    )
    const client = createGreenApiClient(credentials)

    const notification = await client.receiveNotification(5)

    expect(notification?.receiptId).toBe(7)
    expect(notification?.body.senderData?.senderPhoneNumber).toBe(79998887766)
  })
})

describe('ошибки', () => {
  it('переводит 401 в понятное сообщение о учётных данных', async () => {
    stubFetch(() => json({ error: 'unauthorized' }, 401))
    const client = createGreenApiClient(credentials)

    await expect(client.getStateInstance()).rejects.toMatchObject({
      name: 'GreenApiError',
      status: 401,
      method: 'getStateInstance',
      message: 'Неверные idInstance или apiTokenInstance',
    })
  })

  it('на 466 сообщает про лимит тарифа', async () => {
    stubFetch(() => json({}, 466))
    const client = createGreenApiClient(credentials)

    await expect(
      client.sendMessage('10000000', 'привет'),
    ).rejects.toThrowError(/лимит/i)
  })

  it('обрыв связи превращает в GreenApiError без статуса', async () => {
    stubFetch(() => Promise.reject(new TypeError('Failed to fetch')))
    const client = createGreenApiClient(credentials)

    const error = await client.getStateInstance().catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(GreenApiError)
    expect((error as GreenApiError).status).toBeNull()
  })

  it('отмену запроса пробрасывает как есть, не подменяя своей ошибкой', async () => {
    const abort = new DOMException('Aborted', 'AbortError')
    stubFetch(() => Promise.reject(abort))
    const client = createGreenApiClient(credentials)

    await expect(client.receiveNotification(5)).rejects.toBe(abort)
  })

  it('не падает необработанным исключением, если тело не JSON', async () => {
    stubFetch(() => new Response('<html>502</html>', { status: 200 }))
    const client = createGreenApiClient(credentials)

    await expect(client.getStateInstance()).rejects.toBeInstanceOf(GreenApiError)
  })

  it('пустой ответ там, где ждём данные, тоже ошибка', async () => {
    stubFetch(() => new Response('', { status: 200 }))
    const client = createGreenApiClient(credentials)

    await expect(client.getStateInstance()).rejects.toThrowError(/пустой ответ/i)
  })
})

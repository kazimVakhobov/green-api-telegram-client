import { describe, expect, it } from 'vitest'

import type { RawWebhook } from '../api/types'
import { parseNotification } from './notificationParser'

const RECEIVED_AT = 1_700_000_000_000

/** Входящее из документации GREEN-API для Telegram, слово в слово. */
const incoming: RawWebhook = {
  typeWebhook: 'incomingMessageReceived',
  timestamp: 1763115112,
  idMessage: '1763115112345',
  senderData: {
    chatId: '10000000',
    chatType: 'user',
    sender: '10000000',
    chatName: 'Василиса Премудрая',
    senderName: 'Василиса Премудрая',
    senderType: 'user',
    senderContactName: 'Василиса Премудрая',
    senderPhoneNumber: 79998887766,
  },
  messageData: {
    typeMessage: 'textMessage',
    textMessageData: { textMessage: 'Я использую GREEN-API' },
  },
}

/** Исходящее: senderPhoneNumber здесь — номер самого инстанса. */
const outgoing: RawWebhook = {
  typeWebhook: 'outgoingMessageReceived',
  timestamp: 1763115200,
  idMessage: '1763115200111',
  senderData: {
    chatId: '10000000',
    sender: '10000000',
    chatName: 'Василиса Премудрая',
    senderName: 'Василиса Премудрая',
    senderPhoneNumber: 79876543210,
  },
  messageData: {
    typeMessage: 'textMessage',
    textMessageData: { textMessage: 'Отправлено с телефона' },
  },
}

describe('входящее сообщение', () => {
  it('разбирается в сообщение модели', () => {
    expect(parseNotification(incoming, RECEIVED_AT)).toEqual({
      direction: 'in',
      idMessage: '1763115112345',
      text: 'Я использую GREEN-API',
      timestamp: 1763115112000,
      phone: '79998887766',
      apiChatId: '10000000',
      senderName: 'Василиса Премудрая',
    })
  })

  it('время переводит из секунд в миллисекунды', () => {
    const parsed = parseNotification(incoming, RECEIVED_AT)
    expect(parsed?.timestamp).toBe(1763115112 * 1000)
  })

  it('без времени берёт момент получения', () => {
    const parsed = parseNotification(
      { ...incoming, timestamp: undefined },
      RECEIVED_AT,
    )
    expect(parsed?.timestamp).toBe(RECEIVED_AT)
  })

  it('номер достаёт из chatId, когда senderPhoneNumber не пришёл', () => {
    const parsed = parseNotification(
      {
        ...incoming,
        senderData: { chatId: '79991234567@c.us' },
      },
      RECEIVED_AT,
    )

    expect(parsed).toMatchObject({
      phone: '79991234567',
      apiChatId: '79991234567@c.us',
    })
  })

  it('без номера вовсе оставляет только chatId', () => {
    const parsed = parseNotification(
      { ...incoming, senderData: { chatId: '10000000' } },
      RECEIVED_AT,
    )

    expect(parsed).toMatchObject({ phone: null, senderName: null })
  })

  it('берёт текст из extendedTextMessageData, если пришёл он', () => {
    const parsed = parseNotification(
      {
        ...incoming,
        messageData: {
          typeMessage: 'extendedTextMessage',
          extendedTextMessageData: { text: 'со ссылкой https://green-api.com' },
        },
      },
      RECEIVED_AT,
    )

    expect(parsed?.text).toBe('со ссылкой https://green-api.com')
  })
})

describe('исходящее сообщение', () => {
  it('не подставляет свой же номер вместо номера собеседника', () => {
    const parsed = parseNotification(outgoing, RECEIVED_AT)

    expect(parsed).toMatchObject({
      direction: 'out',
      phone: null,
      apiChatId: '10000000',
      senderName: 'Василиса Премудрая',
    })
  })

  it('номер берёт из chatId, если тот записан через @c.us', () => {
    const parsed = parseNotification(
      {
        ...outgoing,
        senderData: { ...outgoing.senderData, chatId: '79991234567@c.us' },
      },
      RECEIVED_AT,
    )

    expect(parsed?.phone).toBe('79991234567')
  })

  it('отправленное через API разбирается так же', () => {
    const parsed = parseNotification(
      { ...outgoing, typeWebhook: 'outgoingAPIMessageReceived' },
      RECEIVED_AT,
    )

    expect(parsed?.direction).toBe('out')
  })
})

describe('что пропускаем', () => {
  it('чужие типы вебхуков', () => {
    expect(
      parseNotification(
        { ...incoming, typeWebhook: 'outgoingMessageStatus' },
        RECEIVED_AT,
      ),
    ).toBeNull()
    expect(
      parseNotification(
        { ...incoming, typeWebhook: 'stateInstanceChanged' },
        RECEIVED_AT,
      ),
    ).toBeNull()
    expect(parseNotification({}, RECEIVED_AT)).toBeNull()
  })

  it('нетекстовые сообщения', () => {
    expect(
      parseNotification(
        { ...incoming, messageData: { typeMessage: 'imageMessage' } },
        RECEIVED_AT,
      ),
    ).toBeNull()
  })

  it('пустой текст', () => {
    expect(
      parseNotification(
        {
          ...incoming,
          messageData: {
            typeMessage: 'textMessage',
            textMessageData: { textMessage: '' },
          },
        },
        RECEIVED_AT,
      ),
    ).toBeNull()
  })

  it('сообщение без idMessage — его нечем дедуплицировать', () => {
    expect(
      parseNotification({ ...incoming, idMessage: undefined }, RECEIVED_AT),
    ).toBeNull()
  })
})

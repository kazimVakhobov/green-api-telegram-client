import { describe, expect, it } from 'vitest'

import { chatsReducer, initialChatsState, sendTarget } from './chatsReducer'
import type { ChatsAction } from './chatsReducer'
import type { Chat, ChatsState, ReceivedMessage } from './types'

const PHONE = '79991234567'
const API_CHAT_ID = '10000000'

function apply(state: ChatsState, ...actions: ChatsAction[]): ChatsState {
  return actions.reduce(chatsReducer, state)
}

function started(phone = PHONE, timestamp = 1000): ChatsAction {
  return { type: 'chatStarted', phone, title: null, timestamp }
}

function received(patch: Partial<ReceivedMessage> = {}): ChatsAction {
  return {
    type: 'messageReceived',
    message: {
      direction: 'in',
      idMessage: 'ID-1',
      text: 'привет',
      timestamp: 2000,
      phone: PHONE,
      apiChatId: API_CHAT_ID,
      senderName: 'Василиса',
      ...patch,
    },
  }
}

describe('создание чата', () => {
  it('заводит чат по номеру и сразу открывает его', () => {
    const state = apply(initialChatsState, started())

    expect(state.chats).toHaveLength(1)
    expect(state.chats[0]).toMatchObject({
      id: PHONE,
      phone: PHONE,
      apiChatId: null,
      title: '+7 999 123-45-67',
      messages: [],
    })
    expect(state.activeChatId).toBe(PHONE)
  })

  it('берёт заданное имя вместо номера', () => {
    const state = apply(initialChatsState, {
      type: 'chatStarted',
      phone: PHONE,
      title: '  Василиса  ',
      timestamp: 1000,
    })

    expect(state.chats[0]?.title).toBe('Василиса')
  })

  it('повторный номер не плодит второй чат, а открывает прежний', () => {
    const state = apply(initialChatsState, started(), started('79990000000'), {
      type: 'chatStarted',
      phone: PHONE,
      title: 'другое имя',
      timestamp: 3000,
    })

    expect(state.chats).toHaveLength(2)
    expect(state.activeChatId).toBe(PHONE)
    expect(state.chats.find((chat) => chat.id === PHONE)?.title).toBe(
      '+7 999 123-45-67',
    )
  })
})

describe('отправка', () => {
  const queued: ChatsAction = {
    type: 'messageQueued',
    chatId: PHONE,
    localId: 'local-1',
    text: 'как дела',
    timestamp: 1500,
  }

  it('кладёт сообщение в чат со статусом pending', () => {
    const state = apply(initialChatsState, started(), queued)

    expect(state.chats[0]?.messages).toEqual([
      {
        id: 'local-1',
        direction: 'out',
        text: 'как дела',
        timestamp: 1500,
        status: 'pending',
      },
    ])
  })

  it('после ответа API меняет локальный id на idMessage', () => {
    const state = apply(initialChatsState, started(), queued, {
      type: 'messageSent',
      chatId: PHONE,
      localId: 'local-1',
      idMessage: 'BAE5F4886F6F2D05',
    })

    expect(state.chats[0]?.messages[0]).toMatchObject({
      id: 'BAE5F4886F6F2D05',
      status: 'sent',
    })
  })

  it('помечает неудачу, сохраняя текст и причину', () => {
    const state = apply(initialChatsState, started(), queued, {
      type: 'messageFailed',
      chatId: PHONE,
      localId: 'local-1',
      reason: 'Исчерпан лимит запросов на тарифе',
    })

    expect(state.chats[0]?.messages[0]).toMatchObject({
      text: 'как дела',
      status: 'failed',
      error: 'Исчерпан лимит запросов на тарифе',
    })
  })

  it('подтверждение несуществующего сообщения оставляет состояние прежним', () => {
    const before = apply(initialChatsState, started(), queued)
    const after = chatsReducer(before, {
      type: 'messageSent',
      chatId: PHONE,
      localId: 'его-тут-нет',
      idMessage: 'X',
    })

    expect(after).toBe(before)
  })
})

describe('sendTarget', () => {
  const chat: Chat = {
    id: PHONE,
    phone: PHONE,
    apiChatId: API_CHAT_ID,
    title: 'Василиса',
    messages: [],
    updatedAt: 0,
  }

  it('пока номер известен, шлём по номеру', () => {
    expect(sendTarget(chat)).toBe('79991234567@c.us')
  })

  it('без номера остаётся числовой chatId', () => {
    expect(sendTarget({ ...chat, phone: null })).toBe(API_CHAT_ID)
  })

  it('без того и другого отправлять некуда', () => {
    expect(sendTarget({ ...chat, phone: null, apiChatId: null })).toBeNull()
  })
})

describe('приём', () => {
  it('входящее попадает в чат, заведённый по номеру', () => {
    const state = apply(initialChatsState, started(), received())

    expect(state.chats).toHaveLength(1)
    expect(state.chats[0]?.messages).toEqual([
      { id: 'ID-1', direction: 'in', text: 'привет', timestamp: 2000 },
    ])
  })

  it('первое входящее запоминает числовой chatId', () => {
    const state = apply(initialChatsState, started(), received())

    expect(state.chats[0]?.apiChatId).toBe(API_CHAT_ID)
  })

  it('следующее входящее находит чат по chatId, даже если номер скрыт', () => {
    const state = apply(
      initialChatsState,
      started(),
      received(),
      received({ idMessage: 'ID-2', phone: null, text: 'и ещё раз' }),
    )

    expect(state.chats).toHaveLength(1)
    expect(state.chats[0]?.messages).toHaveLength(2)
  })

  it('без чата заводит новый и берёт имя отправителя', () => {
    const state = apply(initialChatsState, received())

    expect(state.chats[0]).toMatchObject({
      id: PHONE,
      apiChatId: API_CHAT_ID,
      title: 'Василиса',
    })
  })

  it('когда нет ни номера, ни имени, ключом служит chatId', () => {
    const state = apply(
      initialChatsState,
      received({ phone: null, senderName: null }),
    )

    expect(state.chats[0]).toMatchObject({
      id: API_CHAT_ID,
      phone: null,
      title: API_CHAT_ID,
    })
  })

  it('уведомление, которое не к чему привязать, пропускается', () => {
    const state = chatsReducer(
      initialChatsState,
      received({ phone: null, apiChatId: null }),
    )

    expect(state).toBe(initialChatsState)
  })

  it('поднимает чат наверх списка', () => {
    const state = apply(
      initialChatsState,
      started('79990000000', 500),
      started(PHONE, 600),
      { type: 'chatOpened', chatId: '79990000000' },
      received(),
    )

    expect(state.chats.map((chat) => chat.id)).toEqual([PHONE, '79990000000'])
    // Пришедшее сообщение не перетаскивает пользователя в другой чат.
    expect(state.activeChatId).toBe('79990000000')
  })

  it('сообщение, отправленное из приложения Telegram, видно как исходящее', () => {
    const state = apply(
      initialChatsState,
      started(),
      received({ direction: 'out', idMessage: 'ID-OUT', text: 'с телефона' }),
    )

    expect(state.chats[0]?.messages[0]).toMatchObject({
      direction: 'out',
      status: 'sent',
      text: 'с телефона',
    })
  })
})

describe('дедупликация', () => {
  it('эхо собственной отправки не задваивает сообщение', () => {
    const sent = apply(
      initialChatsState,
      started(),
      {
        type: 'messageQueued',
        chatId: PHONE,
        localId: 'local-1',
        text: 'как дела',
        timestamp: 1500,
      },
      {
        type: 'messageSent',
        chatId: PHONE,
        localId: 'local-1',
        idMessage: 'BAE5F4886F6F2D05',
      },
    )

    const afterEcho = chatsReducer(
      sent,
      received({
        direction: 'out',
        idMessage: 'BAE5F4886F6F2D05',
        text: 'как дела',
      }),
    )

    expect(afterEcho).toBe(sent)
  })

  it('повтор входящего из очереди тоже отсекается', () => {
    const once = apply(initialChatsState, started(), received())
    const twice = chatsReducer(once, received())

    expect(twice).toBe(once)
  })
})

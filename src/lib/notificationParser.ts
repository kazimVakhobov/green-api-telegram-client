import type { RawWebhook } from '../api/types'
import type { ReceivedMessage } from '../store/types'
import { normalizePhone, phoneFromNotification } from './phoneNumber'

function directionOf(typeWebhook: string | undefined): 'in' | 'out' | null {
  if (typeWebhook === 'incomingMessageReceived') return 'in'
  if (
    typeWebhook === 'outgoingMessageReceived' ||
    typeWebhook === 'outgoingAPIMessageReceived'
  ) {
    return 'out'
  }
  return null
}

/** Номер внутри `79991234567@c.us`, если chatId пришёл в такой форме. */
function phoneFromChatId(chatId: string | undefined): string | null {
  if (chatId === undefined) return null

  const match = /^(\d+)@c\.us$/.exec(chatId)
  return match === null ? null : normalizePhone(match[1])
}

function textOf(body: RawWebhook): string | null {
  const data = body.messageData
  if (data === undefined) return null

  const text =
    data.textMessageData?.textMessage ?? data.extendedTextMessageData?.text

  return text === undefined || text.length === 0 ? null : text
}

/**
 * Превращает сырое уведомление в сообщение модели. `null` — уведомление нам
 * неинтересно: другой тип вебхука, нетекстовое сообщение, нет idMessage.
 * Подтверждать его в очереди всё равно нужно, но это забота вызывающего.
 */
export function parseNotification(
  body: RawWebhook,
  receivedAt: number,
): ReceivedMessage | null {
  const direction = directionOf(body.typeWebhook)
  if (direction === null) return null

  const text = textOf(body)
  if (text === null) return null

  const idMessage = body.idMessage
  if (idMessage === undefined || idMessage.length === 0) return null

  const sender = body.senderData ?? {}

  /*
   * У исходящих уведомлений `senderPhoneNumber` — наш собственный номер, он же
   * `instanceData.wid`; собеседник сидит в `chatId`. Если взять номер отсюда,
   * отправленное с телефона уедет в чат с самим собой.
   */
  const phone =
    direction === 'in'
      ? (phoneFromNotification(sender.senderPhoneNumber) ??
        phoneFromChatId(sender.chatId))
      : phoneFromChatId(sender.chatId)

  const name =
    direction === 'in'
      ? (sender.senderName ?? sender.senderContactName ?? sender.chatName)
      : sender.chatName

  return {
    direction,
    idMessage,
    text,
    // В уведомлении время в секундах Unix, а модель живёт в миллисекундах.
    timestamp:
      typeof body.timestamp === 'number' ? body.timestamp * 1000 : receivedAt,
    phone,
    apiChatId: sender.chatId ?? null,
    senderName: name ?? null,
  }
}

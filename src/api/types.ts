export interface InstanceCredentials {
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

export type InstanceState =
  | 'authorized'
  | 'notAuthorized'
  | 'blocked'
  | 'suspended'
  | 'starting'
  | 'pendingPassword'

/** Из `getSettings` берём только то, от чего зависит приём через HTTP API. */
export interface InstanceSettings {
  webhookUrl?: string
  incomingWebhook?: string
  outgoingMessageWebhook?: string
}

/**
 * Дальше — форма уведомлений «как пришло по сети». Почти всё помечено
 * необязательным намеренно: это неразобранный JSON, типов которому никто не
 * гарантировал. Сужением до доменных сообщений занимается lib/, а не этот файл.
 */

export interface RawSenderData {
  chatId?: string
  chatName?: string
  chatType?: string
  sender?: string
  senderName?: string
  senderType?: string
  senderContactName?: string
  /** В Telegram приходит числом: 79998887766, без `@c.us` и без плюса. */
  senderPhoneNumber?: number
}

export interface RawMessageData {
  typeMessage?: string
  textMessageData?: { textMessage?: string }
  /** Текст с предпросмотром ссылки приходит отдельным типом и другим полем. */
  extendedTextMessageData?: { text?: string }
}

export interface RawWebhook {
  typeWebhook?: string
  timestamp?: number
  idMessage?: string
  senderData?: RawSenderData
  messageData?: RawMessageData
}

export interface QueuedNotification {
  receiptId: number
  body: RawWebhook
}

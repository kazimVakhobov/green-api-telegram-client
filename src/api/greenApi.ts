import type {
  InstanceCredentials,
  InstanceState,
  QueuedNotification,
} from './types'

/** Консоль GREEN-API показывает этот же хост в поле apiUrl. */
export const DEFAULT_API_URL = 'https://api.green-api.com'

/** Предел длины текста в Telegram — дальше sendMessage отвечает 400. */
export const MESSAGE_MAX_LENGTH = 4096

/** receiveNotification принимает таймаут ожидания только в этих границах. */
const RECEIVE_TIMEOUT_MIN = 5
const RECEIVE_TIMEOUT_MAX = 60

export class GreenApiError extends Error {
  /** `null` означает, что до сервера не дошли: сеть, CORS, обрыв. */
  readonly status: number | null
  readonly method: string

  constructor(method: string, status: number | null, message: string) {
    super(message)
    this.name = 'GreenApiError'
    this.method = method
    this.status = status
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function describeStatus(status: number): string {
  switch (status) {
    case 400:
      return 'GREEN-API отклонил запрос: проверьте параметры'
    case 401:
    case 403:
      return 'Неверные idInstance или apiTokenInstance'
    case 404:
      return 'Инстанс или метод не найден — проверьте apiUrl и idInstance'
    case 429:
      return 'Слишком много запросов, попробуйте чуть позже'
    case 466:
      return 'Исчерпан лимит запросов на тарифе'
    default:
      return status >= 500
        ? 'GREEN-API недоступен, попробуйте позже'
        : `Неожиданный ответ GREEN-API: ${status}`
  }
}

function endpoint(
  credentials: InstanceCredentials,
  method: string,
  tail = '',
): string {
  const host = credentials.apiUrl.trim().replace(/\/+$/, '')
  const id = credentials.idInstance.trim()
  const token = credentials.apiTokenInstance.trim()
  return `${host}/waInstance${id}/${method}/${token}${tail}`
}

/** `null` в результате — успешный ответ с пустым телом, а не ошибка. */
async function call<T>(
  url: string,
  method: string,
  init?: RequestInit,
): Promise<T | null> {
  let response: Response

  try {
    response = await fetch(url, init)
  } catch (error) {
    // Остановку поллинга пробрасываем как есть: это не сбой связи.
    if (isAbortError(error)) throw error
    throw new GreenApiError(method, null, 'Не удалось связаться с GREEN-API')
  }

  if (!response.ok) {
    throw new GreenApiError(
      method,
      response.status,
      describeStatus(response.status),
    )
  }

  // Пустая очередь уведомлений — это 200 с пустым телом либо со строкой `null`.
  const text = (await response.text()).trim()
  if (!text || text === 'null') return null

  try {
    return JSON.parse(text) as T
  } catch {
    throw new GreenApiError(method, response.status, 'GREEN-API вернул не JSON')
  }
}

function requireBody<T>(body: T | null, method: string): T {
  if (body === null) {
    throw new GreenApiError(method, null, 'GREEN-API вернул пустой ответ')
  }
  return body
}

function postJson(payload: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }
}

function clampReceiveTimeout(seconds: number): number {
  const rounded = Math.round(seconds)
  if (rounded < RECEIVE_TIMEOUT_MIN) return RECEIVE_TIMEOUT_MIN
  if (rounded > RECEIVE_TIMEOUT_MAX) return RECEIVE_TIMEOUT_MAX
  return rounded
}

export function createGreenApiClient(credentials: InstanceCredentials) {
  const url = (method: string, tail?: string) =>
    endpoint(credentials, method, tail)

  return {
    credentials,

    async getStateInstance(signal?: AbortSignal): Promise<InstanceState> {
      const body = await call<{ stateInstance: InstanceState }>(
        url('getStateInstance'),
        'getStateInstance',
        { signal },
      )
      return requireBody(body, 'getStateInstance').stateInstance
    },

    /** Возвращает idMessage: по нему потом узнаём эхо собственной отправки. */
    async sendMessage(
      chatId: string,
      message: string,
      signal?: AbortSignal,
    ): Promise<string> {
      const body = await call<{ idMessage: string }>(
        url('sendMessage'),
        'sendMessage',
        { ...postJson({ chatId, message }), signal },
      )
      return requireBody(body, 'sendMessage').idMessage
    },

    /**
     * Длинный опрос: соединение висит до receiveTimeout секунд, пока в очереди
     * не появится уведомление. `null` — за это время ничего не пришло.
     */
    async receiveNotification(
      receiveTimeout: number,
      signal?: AbortSignal,
    ): Promise<QueuedNotification | null> {
      const seconds = clampReceiveTimeout(receiveTimeout)
      return call<QueuedNotification>(
        url('receiveNotification', `?receiveTimeout=${seconds}`),
        'receiveNotification',
        { signal },
      )
    },

    /**
     * Подтверждение обработки. Без него уведомление выдадут снова, и очередь
     * встанет на нём — поэтому вызываем для всех типов, даже ненужных нам.
     */
    async deleteNotification(
      receiptId: number,
      signal?: AbortSignal,
    ): Promise<void> {
      await call(
        url('deleteNotification', `/${receiptId}`),
        'deleteNotification',
        { method: 'DELETE', signal },
      )
    },
  }
}

export type GreenApiClient = ReturnType<typeof createGreenApiClient>

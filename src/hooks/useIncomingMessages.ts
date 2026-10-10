import { useEffect, useState } from 'react'
import type { ActionDispatch } from 'react'

import { GreenApiError, isAbortError } from '../api/greenApi'
import type { GreenApiClient } from '../api/greenApi'
import { parseNotification } from '../lib/notificationParser'
import type { ChatsAction } from '../store/chatsReducer'

/** Сколько секунд держать соединение открытым, ожидая уведомление. */
const RECEIVE_TIMEOUT_SECONDS = 20

const FIRST_RETRY_MS = 1000
const MAX_RETRY_MS = 30_000

/** 1с, 2с, 4с… и дальше не реже раза в полминуты. */
function retryDelay(failures: number): number {
  return Math.min(MAX_RETRY_MS, FIRST_RETRY_MS * 2 ** (failures - 1))
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
  })
}

/**
 * Длинный опрос очереди уведомлений. Возвращает текст последней ошибки, пока
 * связь не восстановится, — иначе повторные попытки шли бы совсем молча.
 */
export function useIncomingMessages(
  client: GreenApiClient,
  dispatch: ActionDispatch<[action: ChatsAction]>,
): string | null {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let failures = 0

    async function poll() {
      while (!controller.signal.aborted) {
        try {
          const notification = await client.receiveNotification(
            RECEIVE_TIMEOUT_SECONDS,
            controller.signal,
          )

          if (failures > 0) {
            failures = 0
            setError(null)
          }

          if (notification === null) continue

          const message = parseNotification(notification.body, Date.now())
          if (message !== null) {
            dispatch({ type: 'messageReceived', message })
          }

          /*
           * Подтверждаем любое уведомление, включая неинтересные нам типы:
           * неподтверждённое выдадут снова, и очередь встанет на нём навсегда.
           */
          await client.deleteNotification(
            notification.receiptId,
            controller.signal,
          )
        } catch (cause) {
          if (isAbortError(cause) || controller.signal.aborted) return

          failures += 1
          setError(
            cause instanceof GreenApiError
              ? cause.message
              : 'Не удалось получить сообщения',
          )
          await wait(retryDelay(failures), controller.signal)
        }
      }
    }

    void poll()

    return () => {
      controller.abort()
    }
  }, [client, dispatch])

  return error
}

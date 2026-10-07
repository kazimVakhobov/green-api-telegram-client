import { useState } from 'react'
import type { FormEvent } from 'react'

import {
  createGreenApiClient,
  DEFAULT_API_URL,
  GreenApiError,
} from '../api/greenApi'
import type { InstanceCredentials, InstanceState } from '../api/types'
import styles from './AuthScreen.module.css'

/** Инстанс отвечает, но войти нельзя — объясняем, что делать. */
const STATE_HINTS: Record<Exclude<InstanceState, 'authorized'>, string> = {
  notAuthorized:
    'Инстанс не авторизован: привяжите аккаунт Telegram в консоли GREEN-API',
  starting:
    'Инстанс запускается, это занимает до пяти минут. Попробуйте ещё раз',
  blocked: 'Аккаунт заблокирован на стороне Telegram',
  suspended: 'На аккаунте временные ограничения отправки',
  pendingPassword: 'Инстанс ждёт пароль двухфакторной авторизации',
}

interface AuthScreenProps {
  onAuthorized: (credentials: InstanceCredentials) => void
}

export function AuthScreen({ onAuthorized }: AuthScreenProps) {
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const credentials: InstanceCredentials = {
      apiUrl: apiUrl.trim() || DEFAULT_API_URL,
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
    }

    if (!/^\d+$/.test(credentials.idInstance)) {
      setError('idInstance — это число из консоли GREEN-API')
      return
    }

    if (!credentials.apiTokenInstance) {
      setError('Введите apiTokenInstance')
      return
    }

    setChecking(true)
    setError(null)

    try {
      const state = await createGreenApiClient(credentials).getStateInstance()

      if (state === 'authorized') {
        onAuthorized(credentials)
        return
      }

      setError(STATE_HINTS[state])
    } catch (cause) {
      setError(
        cause instanceof GreenApiError
          ? cause.message
          : 'Не удалось проверить инстанс',
      )
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className={styles.screen}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Вход</h1>
        <p className={styles.lead}>
          Данные инстанса Telegram лежат в консоли GREEN-API, раздел
          «Инстансы».
        </p>

        <label className={styles.field}>
          <span className={styles.label}>idInstance</span>
          <input
            className={styles.input}
            value={idInstance}
            onChange={(event) => setIdInstance(event.target.value)}
            placeholder="4100000000"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            disabled={checking}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>apiTokenInstance</span>
          <input
            className={styles.input}
            type="password"
            value={apiTokenInstance}
            onChange={(event) => setApiTokenInstance(event.target.value)}
            autoComplete="off"
            disabled={checking}
          />
        </label>

        <details className={styles.advanced}>
          <summary className={styles.summary}>Другой хост API</summary>
          <label className={styles.field}>
            <span className={styles.label}>apiUrl</span>
            <input
              className={styles.input}
              value={apiUrl}
              onChange={(event) => setApiUrl(event.target.value)}
              placeholder={DEFAULT_API_URL}
              autoComplete="off"
              spellCheck={false}
              disabled={checking}
            />
          </label>
        </details>

        {error !== null && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <button className={styles.submit} type="submit" disabled={checking}>
          {checking ? 'Проверяем инстанс…' : 'Войти'}
        </button>
      </form>
    </div>
  )
}

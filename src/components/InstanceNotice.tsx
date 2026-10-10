import { useEffect, useState } from 'react'

import { isAbortError } from '../api/greenApi'
import type { GreenApiClient } from '../api/greenApi'
import type { InstanceSettings } from '../api/types'
import styles from './InstanceNotice.module.css'

/**
 * Приём через HTTP API работает только при пустом `webhookUrl` и включённых
 * уведомлениях. Настройки меняются в консоли GREEN-API, поэтому здесь мы их
 * только называем — чинить вслепую чужой инстанс не стоит.
 */
function problemsOf(settings: InstanceSettings): string[] {
  const problems: string[] = []

  if (settings.webhookUrl !== undefined && settings.webhookUrl.length > 0) {
    problems.push(
      'У инстанса задан webhookUrl — уведомления уходят на него, а не в очередь HTTP API. Очистите поле в консоли GREEN-API.',
    )
  }

  if (settings.incomingWebhook !== 'yes') {
    problems.push(
      'Выключен incomingWebhook — входящие сообщения не придут. Включите его в настройках инстанса.',
    )
  }

  if (settings.outgoingMessageWebhook !== 'yes') {
    problems.push(
      'Выключен outgoingMessageWebhook — сообщения, отправленные из приложения Telegram, в переписке не появятся.',
    )
  }

  return problems
}

export function InstanceNotice({ client }: { client: GreenApiClient }) {
  const [problems, setProblems] = useState<string[]>([])

  useEffect(() => {
    const controller = new AbortController()

    client
      .getSettings(controller.signal)
      .then((settings) => setProblems(problemsOf(settings)))
      .catch((error: unknown) => {
        // Недоступность инстанса уже показывает полоска приёма — не дублируем.
        if (!isAbortError(error)) setProblems([])
      })

    return () => {
      controller.abort()
    }
  }, [client])

  if (problems.length === 0) return null

  return (
    <ul className={styles.notice}>
      {problems.map((problem) => (
        <li key={problem}>{problem}</li>
      ))}
    </ul>
  )
}

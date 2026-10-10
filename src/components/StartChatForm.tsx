import { useState } from 'react'
import type { FormEvent } from 'react'

import { normalizePhone } from '../lib/phoneNumber'
import styles from './StartChatForm.module.css'

interface StartChatFormProps {
  onStart: (phone: string, title: string | null) => void
  onCancel: () => void
}

export function StartChatForm({ onStart, onCancel }: StartChatFormProps) {
  const [phone, setPhone] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalized = normalizePhone(phone)
    if (normalized === null) {
      setError('Нужен номер с кодом страны, например 79991234567')
      return
    }

    onStart(normalized, title.trim() || null)
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span className={styles.label}>Номер телефона</span>
        <input
          className={styles.input}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+7 999 123-45-67"
          inputMode="tel"
          autoComplete="off"
          autoFocus
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Имя — необязательно</span>
        <input
          className={styles.input}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          autoComplete="off"
        />
      </label>

      {error !== null && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.actions}>
        <button className={styles.cancel} type="button" onClick={onCancel}>
          Отмена
        </button>
        <button className={styles.confirm} type="submit">
          Создать
        </button>
      </div>
    </form>
  )
}

import { useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'

import { MESSAGE_MAX_LENGTH } from '../api/greenApi'
import styles from './Composer.module.css'

interface ComposerProps {
  onSend: (text: string) => void
}

export function Composer({ onSend }: ComposerProps) {
  const [text, setText] = useState('')
  const input = useRef<HTMLTextAreaElement>(null)

  // Поле растёт под текст. Высоту сбрасываем перед замером, иначе scrollHeight
  // запомнит прежний размер и обратно поле уже не сожмётся.
  useLayoutEffect(() => {
    const element = input.current
    if (element === null) return

    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  }, [text])

  function submit() {
    const trimmed = text.trim()
    if (trimmed.length === 0) return

    onSend(trimmed)
    setText('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit()
  }

  // Enter отправляет, Shift+Enter переносит строку — как в Telegram.
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) return

    event.preventDefault()
    submit()
  }

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
      <textarea
        ref={input}
        className={styles.input}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Сообщение"
        maxLength={MESSAGE_MAX_LENGTH}
        rows={1}
        aria-label="Текст сообщения"
      />
      <button
        className={styles.send}
        type="submit"
        disabled={text.trim().length === 0}
        aria-label="Отправить"
      >
        ➤
      </button>
    </form>
  )
}

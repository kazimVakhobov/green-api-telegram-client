import { formatTime } from '../lib/time'
import type { Message, MessageStatus } from '../store/types'
import styles from './Bubble.module.css'

const STATUS_TITLE: Record<MessageStatus, string> = {
  pending: 'Отправляется',
  sent: 'Отправлено',
  failed: 'Не отправлено',
}

function StatusMark({ status }: { status: MessageStatus }) {
  return (
    <span
      className={`${styles.status} ${styles[status]}`}
      title={STATUS_TITLE[status]}
      role="img"
      aria-label={STATUS_TITLE[status]}
    >
      {status === 'pending' ? '◌' : status === 'sent' ? '✓' : '!'}
    </span>
  )
}

export function Bubble({ message }: { message: Message }) {
  const outgoing = message.direction === 'out'

  return (
    <div className={`${styles.row} ${outgoing ? styles.right : styles.left}`}>
      <div
        className={`${styles.bubble} ${outgoing ? styles.outgoing : styles.incoming}`}
      >
        <span className={styles.text}>{message.text}</span>
        <span className={styles.meta}>
          <time dateTime={new Date(message.timestamp).toISOString()}>
            {formatTime(message.timestamp)}
          </time>
          {message.direction === 'out' && <StatusMark status={message.status} />}
        </span>
      </div>
    </div>
  )
}

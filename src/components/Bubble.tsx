import { formatTime } from '../lib/time'
import type { Message, MessageStatus } from '../store/types'
import styles from './Bubble.module.css'

const STATUS_TITLE: Record<MessageStatus, string> = {
  pending: 'Отправляется',
  sent: 'Отправлено',
  failed: 'Не отправлено',
}

const STATUS_MARK: Record<MessageStatus, string> = {
  pending: '◌',
  sent: '✓',
  failed: '!',
}

function StatusMark({ status }: { status: MessageStatus }) {
  return (
    <span
      className={`${styles.status} ${styles[status]}`}
      role="img"
      aria-label={STATUS_TITLE[status]}
    >
      {STATUS_MARK[status]}
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

      {message.direction === 'out' && message.error !== undefined && (
        <p className={styles.reason}>{message.error}</p>
      )}
    </div>
  )
}

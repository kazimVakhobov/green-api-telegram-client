import styles from './ChatAvatar.module.css'

/** Палитра аватаров web-клиента Telegram. */
const COLORS = [
  '#e17076',
  '#7bc862',
  '#65aadd',
  '#a695e7',
  '#ee7aae',
  '#faa774',
]

/** Цвет должен быть один и тот же у чата всегда, поэтому считаем его из ключа. */
function pickColor(seed: string): string {
  let hash = 0
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) % 9973
  }
  return COLORS[hash % COLORS.length]
}

function initials(title: string): string {
  const letters = title
    .split(/\s+/)
    .map((word) => /[\p{L}\p{N}]/u.exec(word)?.[0])
    .filter((letter) => letter !== undefined)
    .slice(0, 2)

  return letters.length === 0 ? '?' : letters.join('').toUpperCase()
}

interface ChatAvatarProps {
  title: string
  seed: string
  /** Размер задаёт родитель: в списке и в шапке он разный. */
  className?: string
}

export function ChatAvatar({ title, seed, className }: ChatAvatarProps) {
  return (
    <div
      className={className ? `${styles.avatar} ${className}` : styles.avatar}
      style={{ background: pickColor(seed) }}
      aria-hidden="true"
    >
      {initials(title)}
    </div>
  )
}

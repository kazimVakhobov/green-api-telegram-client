/**
 * Нормальная форма номера — только цифры с кодом страны: `79991234567`.
 * Именно она служит ключом чата, пока Telegram не пришлёт свой числовой id.
 */

/**
 * Десять цифр — это самые короткие номера E.164 (например, датские: +45 и восемь
 * цифр). Поэтому российский номер без кода страны от датского с кодом по длине
 * не отличить, и в форме мы просим вводить код явно.
 */
const MIN_DIGITS = 10
const MAX_DIGITS = 15

export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 0) return null

  // 8 (999) 123-45-67 и +7 999 123-45-67 — один номер, набранный по привычке.
  const normalized =
    digits.length === 11 && digits.startsWith('8')
      ? `7${digits.slice(1)}`
      : digits

  if (normalized.length < MIN_DIGITS || normalized.length > MAX_DIGITS) {
    return null
  }

  return normalized
}

/** Адрес для sendMessage: по номеру уходит самое первое сообщение в чат. */
export function toApiChatId(phone: string): string {
  return `${phone}@c.us`
}

/** `+7 999 123-45-67` для российских номеров, `+<цифры>` для остальных. */
export function formatPhone(phone: string): string {
  const russian = /^7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(phone)
  if (russian === null) return `+${phone}`

  const [, code, first, second, third] = russian
  return `+7 ${code} ${first}-${second}-${third}`
}

/** В уведомлениях `senderPhoneNumber` приходит числом, а не строкой. */
export function phoneFromNotification(value: number | undefined): string | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return null
  }
  return normalizePhone(String(value))
}

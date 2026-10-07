import { describe, expect, it } from 'vitest'

import {
  formatPhone,
  normalizePhone,
  phoneFromNotification,
  toApiChatId,
} from './phoneNumber'

describe('normalizePhone', () => {
  it('выбрасывает всё, кроме цифр', () => {
    expect(normalizePhone('+7 (999) 123-45-67')).toBe('79991234567')
  })

  it('приводит привычную восьмёрку к коду страны', () => {
    expect(normalizePhone('8 999 123 45 67')).toBe('79991234567')
  })

  it('не трогает номер, который уже нормален', () => {
    expect(normalizePhone('79991234567')).toBe('79991234567')
  })

  it('не принимает восьмёрку за код страны у длинных номеров', () => {
    // 8-значный китайский код 86 в начале 13-значного номера трогать нельзя.
    expect(normalizePhone('8612345678901')).toBe('8612345678901')
  })

  it('отвергает слишком короткое', () => {
    expect(normalizePhone('123456789')).toBeNull()
  })

  it('отвергает слишком длинное', () => {
    expect(normalizePhone('1234567890123456')).toBeNull()
  })

  it('отвергает строку без цифр', () => {
    expect(normalizePhone('позвони мне')).toBeNull()
    expect(normalizePhone('')).toBeNull()
  })
})

describe('formatPhone', () => {
  it('российский номер разбивает по группам', () => {
    expect(formatPhone('79991234567')).toBe('+7 999 123-45-67')
  })

  it('остальные показывает как есть, с плюсом', () => {
    expect(formatPhone('4512345678')).toBe('+4512345678')
  })
})

describe('toApiChatId', () => {
  it('добавляет суффикс, который ждёт sendMessage', () => {
    expect(toApiChatId('79991234567')).toBe('79991234567@c.us')
  })
})

describe('phoneFromNotification', () => {
  it('переводит число из уведомления в нормальную форму', () => {
    expect(phoneFromNotification(79998887766)).toBe('79998887766')
  })

  it('отсутствие номера — не ошибка, а null', () => {
    expect(phoneFromNotification(undefined)).toBeNull()
  })

  it('мусорное значение отбрасывает', () => {
    expect(phoneFromNotification(0)).toBeNull()
    expect(phoneFromNotification(123)).toBeNull()
  })
})

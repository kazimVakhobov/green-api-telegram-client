const HH_MM = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
})

export function formatTime(timestamp: number): string {
  return HH_MM.format(timestamp)
}

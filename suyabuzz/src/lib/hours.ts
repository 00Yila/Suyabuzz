export type OpeningHour = { day: string; opens: string; closes: string }

const DAY_LABEL: Record<string, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
}

const DAY_SCHEMA: Record<string, string> = {
  monday: 'Mo', tuesday: 'Tu', wednesday: 'We',
  thursday: 'Th', friday: 'Fr', saturday: 'Sa', sunday: 'Su',
}

function parse(hhmm: string): { hour: number; minute: number } {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm)
  if (!match) throw new Error(`Not a valid 24-hour time: ${hhmm}`)

  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) throw new Error(`Not a valid 24-hour time: ${hhmm}`)

  return { hour, minute }
}

export function formatTime(hhmm: string): string {
  const { hour, minute } = parse(hhmm)
  const suffix = hour < 12 ? 'am' : 'pm'
  const twelve = hour % 12 === 0 ? 12 : hour % 12
  return minute === 0 ? `${twelve}${suffix}` : `${twelve}:${String(minute).padStart(2, '0')}${suffix}`
}

export function formatHours(hours: OpeningHour[]): string[] {
  return hours.map(
    ({ day, opens, closes }) =>
      `${DAY_LABEL[day] ?? day} ${formatTime(opens)} – ${formatTime(closes)}`,
  )
}

export function toSchemaOrgHours(hours: OpeningHour[]): string[] {
  return hours.map(({ day, opens, closes }) => `${DAY_SCHEMA[day] ?? day} ${opens}-${closes}`)
}

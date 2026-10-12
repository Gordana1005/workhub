/**
 * Local-calendar-day helpers. `toISOString().split('T')[0]` gives the UTC day, which is
 * yesterday/tomorrow for users near midnight; use these for any user-facing "today" date.
 */

/** 'YYYY-MM-DD' for the given date in the user's local timezone. */
export function localDateString(d: Date = new Date()): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

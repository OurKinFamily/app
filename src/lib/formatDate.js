/**
 * A person's date, written the way it would be said.
 *
 * A date-only ISO string parses as UTC, which in western timezones renders a
 * day early — birthdays landing on the wrong day is the kind of bug a family
 * notices immediately. Pinning it to local midnight keeps the calendar date.
 *
 * Precision matters as much as the date: the archive knows some dates to the
 * day and some only to the year, and printing "January 1, 1887" for a year we
 * guessed would be inventing a birthday.
 */
export function formatDate(date, precision) {
  if (!date) return null
  if (precision === 'year') return String(date).slice(0, 4)
  const local = /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00` : date
  return new Date(local).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

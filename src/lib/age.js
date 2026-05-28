// ageAt(birthDate, photoTimestamp, photoConfidence, birthPrecision)
//
// Computes a human-friendly age string ("38 yrs", "8 months", "5 days",
// "newborn") for a person at the moment a photo was taken.
//
// Returns null when:
// - Either input is missing
// - Photo timestamp is not high-confidence (avoids stamping a misleading
//   age from filesystem birth times)
// - Photo predates birth
//
// `birthPrecision` ('year' | 'month' | 'day' | undefined) controls the
// granularity we trust. A "1942" birth (year precision) shouldn't yield
// "newborn" or "5 days" — clamp those to the most specific unit the
// birth date actually supports.

export function ageAt(birthDate, photoTs, photoConfidence, birthPrecision) {
  if (!birthDate || !photoTs) return null
  if (photoConfidence && photoConfidence !== 'high') return null

  const b = new Date(birthDate)
  const t = new Date(photoTs)
  if (isNaN(b) || isNaN(t)) return null
  if (t < b) return null

  let years  = t.getUTCFullYear() - b.getUTCFullYear()
  let months = t.getUTCMonth()    - b.getUTCMonth()
  let days   = t.getUTCDate()     - b.getUTCDate()

  if (days < 0) {
    months -= 1
    const prev = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 0))
    days += prev.getUTCDate()
  }
  if (months < 0) {
    years  -= 1
    months += 12
  }

  if (years >= 1) {
    return `age ${years}`
  }
  // Year-precision births can't reliably claim sub-year ages — the birth
  // could be off by months. Fall back to "age <1" instead of "age 8 months".
  if (birthPrecision === 'year') {
    return 'age <1'
  }
  if (months >= 1) {
    return months === 1 ? 'age 1 month' : `age ${months} months`
  }
  // Month-precision births similarly shouldn't claim a specific day count.
  if (birthPrecision === 'month') {
    return 'age <1 month'
  }
  if (days >= 1) {
    return days === 1 ? 'age 1 day' : `age ${days} days`
  }
  return 'newborn'
}

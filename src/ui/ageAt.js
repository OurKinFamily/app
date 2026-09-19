/**
 * How old somebody was when the photograph was taken.
 *
 * Their age NOW is a fact about today and tells you nothing about the picture.
 * "Age 8" under a face is what makes a photograph legible years later — and in
 * a family archive it is often the only way to place a photo you half
 * remember.
 */
export function ageAt(birthDate, takenAt) {
  if (!birthDate || !takenAt) return null
  const born = new Date(birthDate)
  const when = new Date(takenAt)
  if (Number.isNaN(born.getTime()) || Number.isNaN(when.getTime())) return null

  let years = when.getFullYear() - born.getFullYear()
  const beforeBirthday =
    when.getMonth() < born.getMonth() ||
    (when.getMonth() === born.getMonth() && when.getDate() < born.getDate())
  if (beforeBirthday) years -= 1

  // A photograph from before somebody was born is a data error, not an age.
  if (years < 0) return null
  if (years === 0) {
    const months = Math.max(
      0,
      (when.getFullYear() - born.getFullYear()) * 12 + when.getMonth() - born.getMonth(),
    )
    if (months < 1) return 'Newborn'
    return `${months} month${months === 1 ? '' : 's'}`
  }
  return `Age ${years}`
}

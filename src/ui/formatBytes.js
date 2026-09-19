/** Human-readable file size. */
export function bytes(n) {
  if (!n) return null
  const mb = n / 1048576
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(n / 1024)} KB`
}

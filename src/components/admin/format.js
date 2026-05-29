// Number / byte / relative-time formatters shared across admin pages.
// Lives in its own file so react-refresh can fast-reload component
// modules without invalidating component state every time a formatter
// changes.

export function fmt(n) {
  if (n == null) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toLocaleString()
}

export function bytes(n) {
  if (n == null) return '—'
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)} TB`
  if (n >= 1e9)  return `${(n / 1e9).toFixed(1)} GB`
  if (n >= 1e6)  return `${(n / 1e6).toFixed(0)} MB`
  if (n >= 1e3)  return `${(n / 1e3).toFixed(0)} KB`
  return `${n} B`
}

export function relTime(iso) {
  if (!iso) return ''
  const past = new Date(iso).getTime()
  const sec = Math.max(0, Math.round((Date.now() - past) / 1000))
  if (sec < 60)  return `${sec} second${sec === 1 ? '' : 's'} ago`
  const min = Math.round(sec / 60)
  if (min < 60)  return `${min} minute${min === 1 ? '' : 's'} ago`
  const hr = Math.round(min / 60)
  if (hr < 24)   return `${hr} hour${hr === 1 ? '' : 's'} ago`
  const days = Math.round(hr / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  const mo = Math.round(days / 30)
  if (mo < 12)   return `${mo} month${mo === 1 ? '' : 's'} ago`
  const yr = Math.round(mo / 12)
  return `${yr} year${yr === 1 ? '' : 's'} ago`
}

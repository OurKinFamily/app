import { useState, useEffect, useCallback } from 'react'

// API-backed per-user favorites. Identity comes from the Cloudflare Access
// header on the backend (`/api/me/favorites`). The hook keeps a shared
// module-level Set of paths so multiple components stay in sync, and a
// component-level mirror for re-renders.

const LEGACY_KEY = 'gallery-favs'  // localStorage key from the old hook

let cache    = null   // Set | null (null = not yet loaded)
let inflight = null
const subs   = new Set()

function notify() {
  for (const fn of subs) fn(new Set(cache))
}

async function loadFavorites() {
  if (cache) return cache
  if (inflight) return inflight
  inflight = (async () => {
    const res = await fetch('/api/me/favorites/paths')
    const paths = res.ok ? await res.json() : []
    cache = new Set(paths)
    // One-shot migration of legacy localStorage favorites — POST each to
    // the API, then clear localStorage so subsequent sessions see the
    // server as the only source of truth.
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]')
      for (const p of legacy) {
        if (!cache.has(p)) {
          await fetch(`/api/me/favorites?path=${encodeURIComponent(p)}`, { method: 'PUT' })
          cache.add(p)
        }
      }
      if (legacy.length) localStorage.removeItem(LEGACY_KEY)
    } catch { /* ignore migration failures */ }
    inflight = null
    notify()
    return cache
  })()
  return inflight
}

export function useFavorites() {
  const [favs, setFavs] = useState(() => cache ? new Set(cache) : new Set())

  useEffect(() => {
    subs.add(setFavs)
    if (!cache) loadFavorites()
    return () => { subs.delete(setFavs) }
  }, [])

  const toggle = useCallback(async it => {
    const path = typeof it === 'string' ? it : it?.path
    if (!path) return
    if (!cache) cache = new Set()
    const had = cache.has(path)
    // Optimistic local update
    if (had) cache.delete(path)
    else cache.add(path)
    notify()
    try {
      await fetch(`/api/me/favorites?path=${encodeURIComponent(path)}`, {
        method: had ? 'DELETE' : 'PUT',
      })
    } catch {
      // Roll back on failure
      if (had) cache.add(path)
      else cache.delete(path)
      notify()
    }
  }, [])

  return { favs, toggle }
}

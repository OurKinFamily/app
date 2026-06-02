import { useState, useEffect, useCallback } from 'react'
import { useMe } from '../contexts/MeContext'

// API-backed per-user favorites. Identity comes from the Cloudflare Access
// header on the backend (`/api/me/favorites`). The hook keeps a shared
// module-level Set of paths so multiple components stay in sync, and a
// component-level mirror for re-renders.
//
// In preview-as-person mode, viewer_id is passed to the backend so the
// correct person's favorites are shown. Toggle is disabled in preview mode.

const LEGACY_KEY = 'gallery-favs'  // localStorage key from the old hook

let cache          = null    // Set | null (null = not yet loaded)
let cacheViewerId  = undefined  // which viewerId the cache was loaded for
let inflight       = null
const subs         = new Set()

function notify() {
  for (const fn of subs) fn(new Set(cache))
}

async function loadFavorites(viewerId) {
  // Bust cache if viewer changed
  if (viewerId !== cacheViewerId) {
    cache = null
    cacheViewerId = viewerId
    inflight = null
  }
  if (inflight) return inflight
  inflight = (async () => {
    const url = viewerId
      ? `/api/me/favorites/paths?viewer_id=${viewerId}`
      : '/api/me/favorites/paths'
    const res = await fetch(url)
    const paths = res.ok ? await res.json() : []
    cache = new Set(paths)
    // One-shot migration of legacy localStorage favorites (real user only)
    if (!viewerId) {
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
    }
    inflight = null
    notify()
    return cache
  })()
  return inflight
}

export function useFavorites() {
  const { previewPersonId } = useMe()
  const [favs, setFavs] = useState(() => cache ? new Set(cache) : new Set())

  useEffect(() => {
    subs.add(setFavs)
    // Always re-fetch when viewer changes — don't rely on cache state check
    cache = null
    loadFavorites(previewPersonId || null)
    return () => { subs.delete(setFavs) }
  }, [previewPersonId])

  const toggle = useCallback(async it => {
    if (previewPersonId) return  // no mutations in preview mode
    const path = typeof it === 'string' ? it : it?.path
    if (!path) return
    if (!cache) cache = new Set()
    const had = cache.has(path)
    if (had) cache.delete(path)
    else cache.add(path)
    notify()
    try {
      await fetch(`/api/me/favorites?path=${encodeURIComponent(path)}`, {
        method: had ? 'DELETE' : 'PUT',
      })
    } catch {
      if (had) cache.add(path)
      else cache.delete(path)
      notify()
    }
  }, [previewPersonId])

  return { favs, toggle }
}

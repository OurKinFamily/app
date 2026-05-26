import { useState, useEffect } from 'react'

const KEY = 'gallery-favs'

// Local-only favorites (Set of item paths), persisted to localStorage.
// Wire up to a real API later.
export function useFavorites() {
  const [favs, setFavs] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')) }
    catch { return new Set() }
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify([...favs]))
  }, [favs])

  const toggle = it => setFavs(s => {
    const n = new Set(s)
    n.has(it.path) ? n.delete(it.path) : n.add(it.path)
    return n
  })

  return { favs, toggle }
}

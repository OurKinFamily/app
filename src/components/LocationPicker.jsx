import { useEffect, useState } from 'react'
import { getPlaceShortcuts, geocodePlace } from '../lib/api'

const inputCls = 'w-full rounded border border-white/15 bg-white/5 px-2 py-1 text-[13px] text-white/90 outline-none focus:border-white/40 disabled:opacity-50'

// Validate a lat/lng pair from string inputs → {lat,lng} or null.
export function parseLatLng(latRaw, lngRaw) {
  const lat = parseFloat(latRaw), lng = parseFloat(lngRaw)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

// Reusable location chooser: quick-pick (mmp shortcuts) + debounced free-text
// geocode (OSM) + raw lat/lng inputs. Self-managing; reports the current draft
// to the parent via onChange({ latStr, lngStr, place }) so the parent owns the
// Save/Apply button and validation (via parseLatLng).
export function LocationPicker({ initialLat, initialLng, disabled = false, onChange }) {
  const [latStr, setLatStr] = useState(initialLat != null ? String(initialLat) : '')
  const [lngStr, setLngStr] = useState(initialLng != null ? String(initialLng) : '')
  const [place, setPlace]   = useState('')
  const [places, setPlaces] = useState([])
  const [query, setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [note, setNote]     = useState(null)

  // Bubble the current draft up on every change.
  useEffect(() => { onChange?.({ latStr, lngStr, place }) }, [latStr, lngStr, place, onChange])

  useEffect(() => { getPlaceShortcuts().then(setPlaces).catch(() => {}) }, [])

  // Debounced geocode — type a city/state, results appear below.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setResults([]); return }
    let alive = true
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const found = await geocodePlace(q)
        if (!alive) return
        setResults(found)
        setNote(found.length === 0 ? 'No matches' : null)
      } catch {
        if (alive) setNote('Search failed')
      } finally {
        if (alive) setSearching(false)
      }
    }, 350)
    return () => { alive = false; clearTimeout(timer) }
  }, [query])

  const pickShortcut = name => {
    const p = places.find(x => x.name === name)
    setPlace(name)
    if (p) { setLatStr(String(p.latitude)); setLngStr(String(p.longitude)) }
  }
  const pickResult = r => {
    setLatStr(String(r.latitude))
    setLngStr(String(r.longitude))
    setPlace((r.display_name || '').split(',')[0])
    setResults([])
  }

  return (
    <div className="space-y-2">
      {places.length > 0 && (
        <select
          value={place}
          onChange={e => pickShortcut(e.target.value)}
          disabled={disabled}
          style={{ colorScheme: 'dark' }}
          className={inputCls}
        >
          <option value="" className="bg-neutral-900 text-white">Quick-pick a place…</option>
          {places.map(p => (
            <option key={p.name} value={p.name} className="bg-neutral-900 text-white">{p.name}</option>
          ))}
        </select>
      )}

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          disabled={disabled}
          placeholder="Search a city, state…"
          className={inputCls}
        />
        {searching && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-white/35">…</span>
        )}
      </div>
      {results.length > 0 && (
        <ul className="space-y-1">
          {results.map(r => (
            <li key={`${r.latitude},${r.longitude}`}>
              <button type="button" onClick={() => pickResult(r)}
                      className="w-full rounded border border-white/10 px-2 py-1 text-left text-[11px] text-white/70 transition-colors hover:border-white/30 hover:text-white">
                {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-1">
        <input type="text" inputMode="decimal" value={latStr} onChange={e => setLatStr(e.target.value)}
               disabled={disabled} placeholder="lat" className={inputCls} />
        <input type="text" inputMode="decimal" value={lngStr} onChange={e => setLngStr(e.target.value)}
               disabled={disabled} placeholder="lng" className={inputCls} />
      </div>
      {note && <p className="text-[11px] text-white/35">{note}</p>}
    </div>
  )
}

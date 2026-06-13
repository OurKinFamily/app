import { useState } from 'react'
import { MapPin, Calendar, X } from 'lucide-react'
import { Drawer } from './Drawer'
import { LocationPicker, parseLatLng } from './LocationPicker'
import { bulkSetLocation, bulkRedateMedia } from '../lib/api'

// Parse a date input into { timestamp, precision }. Accepts YYYY | YYYY-MM |
// YYYY-MM-DD (noon local, no tz — server stores as-given).
function parseDate(raw) {
  const v = (raw || '').trim()
  if (/^\d{4}$/.test(v))             return { timestamp: `${v}-01-01T12:00:00`, precision: 'year' }
  if (/^\d{4}-\d{2}$/.test(v))       return { timestamp: `${v}-01T12:00:00`,    precision: 'month' }
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return { timestamp: `${v}T12:00:00`,       precision: 'day' }
  return null
}

const MODES = ['day', 'month', 'year']
const inputCls = 'w-full rounded border border-white/15 bg-white/5 px-2 py-1 text-[13px] text-white/90 outline-none focus:border-white/40 disabled:opacity-50'
const btnCls = 'flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-white/70 transition-colors hover:bg-white/10 hover:text-white'

// Header bar shown when the gallery has a selection. Count + bulk actions
// (set location, set date) + clear. The actions open a Drawer with the right
// picker; on apply they call the bulk API and report back via onDone.
export function GalleryBulkBar({ selectedPaths, onClear, onDone }) {
  const [modal, setModal] = useState(null)   // 'location' | 'date' | null
  const count = selectedPaths.length
  if (count === 0) return null

  const close = () => setModal(null)
  const done = (n) => { close(); onClear?.(); onDone?.(n) }

  return (
    <>
      <div className="flex items-center gap-1">
        <span className="px-1 text-[12px] tabular-nums text-white/70">{count} selected</span>
        <button onClick={() => setModal('location')} className={btnCls}><MapPin size={14} /> Location</button>
        <button onClick={() => setModal('date')} className={btnCls}><Calendar size={14} /> Date</button>
        <button onClick={onClear} aria-label="Clear selection" className="flex h-7 w-7 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white">
          <X size={15} />
        </button>
      </div>

      <Drawer open={modal === 'location'} onClose={close} title={`Set location · ${count}`}>
        {modal === 'location' && <BulkLocationForm paths={selectedPaths} onApplied={done} />}
      </Drawer>
      <Drawer open={modal === 'date'} onClose={close} title={`Set date · ${count}`}>
        {modal === 'date' && <BulkDateForm paths={selectedPaths} onApplied={done} />}
      </Drawer>
    </>
  )
}

function BulkLocationForm({ paths, onApplied }) {
  const [draft, setDraft] = useState({ latStr: '', lngStr: '', place: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const apply = async () => {
    const parsed = parseLatLng(draft.latStr, draft.lngStr)
    if (!parsed) { setError('Enter valid lat, lng'); return }
    setSaving(true)
    try {
      const res = await bulkSetLocation(paths, { latitude: parsed.lat, longitude: parsed.lng, place_name: draft.place || null })
      onApplied?.(res?.updated ?? paths.length)
    } catch (e) {
      setError(e.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-white/50">Apply one location to all {paths.length} selected. Writes graph + sidecar + EXIF on each.</p>
      <LocationPicker disabled={saving} onChange={setDraft} />
      <button onClick={apply} disabled={saving}
              className="rounded bg-white/15 px-3 py-1 text-[12px] text-white transition-colors hover:bg-white/25 disabled:opacity-50">
        {saving ? 'Applying…' : `Apply to ${paths.length}`}
      </button>
      {error && <p className="text-[11px] text-rose-400/80">{error}</p>}
    </div>
  )
}

function BulkDateForm({ paths, onApplied }) {
  const [mode, setMode] = useState('day')
  const [val, setVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const apply = async () => {
    const parsed = parseDate(val)
    if (!parsed) { setError('Pick a date'); return }
    setSaving(true)
    try {
      const res = await bulkRedateMedia(paths, parsed)
      onApplied?.(res?.updated ?? paths.length)
    } catch (e) {
      setError(e.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-white/50">Apply one capture date to all {paths.length} selected.</p>
      <div className="flex gap-1">
        {MODES.map(m => (
          <button key={m} onClick={() => { setMode(m); setVal('') }}
                  className={'rounded px-2 py-0.5 text-[11px] uppercase tracking-wide transition-colors ' +
                    (mode === m ? 'bg-white/15 text-white' : 'bg-white/5 text-white/45 hover:text-white/70')}>
            {m}
          </button>
        ))}
      </div>
      {mode === 'day'   && <input type="date"  value={val} onChange={e => setVal(e.target.value)} className={inputCls} />}
      {mode === 'month' && <input type="month" value={val} onChange={e => setVal(e.target.value)} className={inputCls} />}
      {mode === 'year'  && <input type="number" min={1800} max={2100} step={1} value={val} onChange={e => setVal(e.target.value)} placeholder="YYYY" className={inputCls} />}
      <button onClick={apply} disabled={saving}
              className="rounded bg-white/15 px-3 py-1 text-[12px] text-white transition-colors hover:bg-white/25 disabled:opacity-50">
        {saving ? 'Applying…' : `Apply to ${paths.length}`}
      </button>
      {error && <p className="text-[11px] text-rose-400/80">{error}</p>}
    </div>
  )
}

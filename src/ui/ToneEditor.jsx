import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { buildLut, isNoop } from '../lib/toneCurve'
import { C } from './tokens'

/**
 * Shadows, midtones, highlights — the three-knob version of a curve.
 *
 * A full curve editor is the right tool for somebody who already knows what a
 * curve is. Three named parts of the range is the version a family can use,
 * and it covers what old scans actually need: opening up the dark corners of
 * a print, or pulling back a window that blew out.
 *
 * The preview is drawn in a canvas from the SAME table the server applies, so
 * what is approved is what gets written. It redraws from a copy of the
 * decoded image rather than re-reading the file, which keeps dragging a
 * slider smooth on a twelve-megapixel scan.
 */

// Big enough to judge, small enough to redraw while a slider moves.
const PREVIEW_MAX = 1400

export function ToneEditor({ src, busy, onApply, onCancel }) {
  const [tone, setTone] = useState({ shadows: 0, midtones: 0, highlights: 0 })
  const [ready, setReady] = useState(false)
  const canvas = useRef(null)
  const source = useRef(null)

  // Decode once. Every redraw works from this copy.
  useEffect(() => {
    let alive = true
    const img = new Image()
    img.onload = () => {
      if (!alive) return
      const scale = Math.min(1, PREVIEW_MAX / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const off = document.createElement('canvas')
      off.width = w
      off.height = h
      off.getContext('2d').drawImage(img, 0, 0, w, h)
      source.current = off.getContext('2d').getImageData(0, 0, w, h)
      if (canvas.current) {
        canvas.current.width = w
        canvas.current.height = h
      }
      setReady(true)
    }
    img.src = src
    return () => { alive = false }
  }, [src])

  useEffect(() => {
    const data = source.current
    const el = canvas.current
    if (!ready || !data || !el) return
    const lut = buildLut(tone.shadows, tone.midtones, tone.highlights)
    const out = new ImageData(new Uint8ClampedArray(data.data), data.width, data.height)
    const px = out.data
    // One table for all three channels: this is brightness, and per-channel
    // curves would tint the photograph.
    for (let i = 0; i < px.length; i += 4) {
      px[i] = lut[px[i]]
      px[i + 1] = lut[px[i + 1]]
      px[i + 2] = lut[px[i + 2]]
    }
    el.getContext('2d').putImageData(out, 0, 0)
  }, [ready, tone])

  const set = key => e => setTone(t => ({ ...t, [key]: Number(e.target.value) }))
  const untouched = isNoop(tone.shadows, tone.midtones, tone.highlights)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1400,
      background: 'rgba(16,17,19,.96)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: 16, boxSizing: 'border-box', gap: 12,
    }}>
      <div style={{ flex: 1, minHeight: 0, display: 'grid', placeItems: 'center', width: '100%' }}>
        <canvas
          ref={canvas}
          style={{ maxWidth: '100%', maxHeight: '68vh', display: 'block' }}
        />
      </div>

      <div style={{ width: 'min(460px, 92vw)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Slider label="Highlights" value={tone.highlights} onChange={set('highlights')} />
        <Slider label="Midtones" value={tone.midtones} onChange={set('midtones')} />
        <Slider label="Shadows" value={tone.shadows} onChange={set('shadows')} />
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setTone({ shadows: 0, midtones: 0, highlights: 0 })}
          disabled={untouched}
          style={{ ...button(false), opacity: untouched ? 0.4 : 1 }}
        >
          Reset
        </button>
        <button type="button" onClick={onCancel} disabled={busy} style={button(false)}>
          <X size={15} /> Cancel
        </button>
        <button
          type="button"
          onClick={() => onApply(tone)}
          disabled={busy || untouched}
          style={button(true, busy || untouched)}
        >
          <Check size={15} /> {busy ? 'Saving…' : 'Apply'}
        </button>
      </div>
    </div>
  )
}

function Slider({ label, value, onChange }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 10,
      color: 'rgba(255,255,255,.75)', fontSize: 12,
    }}>
      <span style={{ width: 68 }}>{label}</span>
      <input
        type="range"
        min={-100}
        max={100}
        value={value}
        onChange={onChange}
        style={{ flex: 1, accentColor: '#fff', cursor: 'pointer' }}
      />
      <span style={{
        width: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
        color: value ? '#fff' : 'rgba(255,255,255,.4)',
      }}>
        {value > 0 ? `+${value}` : value}
      </span>
    </label>
  )
}

const button = (primary, off) => ({
  display: 'inline-flex', alignItems: 'center', gap: 7,
  height: 36, padding: '0 18px', borderRadius: 18, fontSize: 13,
  border: primary ? 0 : '1px solid rgba(255,255,255,.25)',
  background: primary ? C.activeText : 'transparent',
  color: '#fff', cursor: off ? 'default' : 'pointer', opacity: off ? 0.5 : 1,
})

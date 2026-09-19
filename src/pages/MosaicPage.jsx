import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, ImagePlus } from 'lucide-react'
import { MosaicControls } from '../ui/admin/MosaicControls'
import { DENSITY, useMosaic } from '../lib/useMosaic'
import { mediumUrl } from '../lib/media'
import { C } from '../ui/tokens'

/**
 * One photograph rebuilt out of thousands of others.
 *
 * The whole page is a preset and a picture: pick how fine, and it renders. The
 * settings that make a mosaic good rather than muddy were found by comparing
 * renders, not by reasoning, so they are set for you and only opened up for
 * anybody who wants to argue with them.
 */
export function MosaicPage() {
  const [params] = useSearchParams()
  const m = useMosaic(params.get('source'))
  const [advanced, setAdvanced] = useState(false)

  const preview = m.source?.preview || (m.source?.path ? mediumUrl(m.source.path) : null)
  const ready = !!m.source && !m.rendering

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 400, margin: '4px 0 6px' }}>Mosaic</h1>
      <p style={{ fontSize: 12.5, color: C.muted, margin: '0 0 18px', maxWidth: '76ch' }}>
        Rebuilds a picture out of the archive — every square is a photograph whose colour
        matches that part of the original. Close up it is the family; from across a room it
        is the face.
      </p>

      <div style={{
        display: 'grid', gap: 18, alignItems: 'start',
        gridTemplateColumns: 'minmax(240px, 280px) minmax(0, 1fr)',
      }}>
        <div>
          <section style={{
            padding: 12, marginBottom: 10, borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.bg,
          }}>
            <h3 style={{ fontSize: 12.5, fontWeight: 500, margin: '0 0 8px' }}>The picture</h3>
            {preview ? (
              <img
                src={preview}
                alt="The picture being rebuilt"
                style={{ width: '100%', borderRadius: 8, display: 'block' }}
              />
            ) : (
              <label style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '26px 12px', borderRadius: 8, cursor: 'pointer',
                border: `1px dashed ${C.border}`, color: C.muted, fontSize: 12.5,
              }}>
                <ImagePlus size={20} />
                Choose one
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => e.target.files?.[0] && m.pickFile(e.target.files[0])}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </section>

          {!advanced && (
            <section style={{
              padding: 12, marginBottom: 10, borderRadius: 10,
              border: `1px solid ${C.border}`, background: C.bg,
            }}>
              <h3 style={{ fontSize: 12.5, fontWeight: 500, margin: '0 0 4px' }}>How fine</h3>
              <p style={{ fontSize: 11, color: C.muted, margin: '0 0 8px' }}>
                Renders as soon as you pick.
              </p>
              <div style={{ display: 'grid', gap: 5 }}>
                {DENSITY.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => m.renderAt(d)}
                    disabled={!ready}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 10px', borderRadius: 8, font: 'inherit',
                      border: `1px solid ${C.border}`, background: C.bg,
                      cursor: ready ? 'pointer' : 'not-allowed',
                      opacity: ready ? 1 : 0.45,
                    }}
                  >
                    <div style={{ fontSize: 13 }}>{d.label}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{d.sub}</div>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setAdvanced(true)} style={link}>
                More settings
              </button>
            </section>
          )}

          {advanced && (
            <>
              <button type="button" onClick={() => setAdvanced(false)} style={{ ...link, marginBottom: 10 }}>
                ← Back to the presets
              </button>
              <MosaicControls {...m} />
              <Estimate estimate={m.estimate} settings={m.settings} />
              <button
                type="button"
                onClick={() => m.render()}
                disabled={!ready}
                style={{
                  width: '100%', height: 34, borderRadius: 17, fontSize: 13,
                  border: 0, background: C.activeText, color: '#fff',
                  cursor: ready ? 'pointer' : 'not-allowed',
                  opacity: ready ? 1 : 0.45,
                }}
              >
                {m.rendering ? 'Rendering…' : 'Render it'}
              </button>
            </>
          )}
        </div>

        <section style={{
          minHeight: 340, padding: 14, borderRadius: 12,
          border: `1px solid ${C.border}`, background: C.bg,
          display: m.result ? 'block' : 'grid', placeItems: 'center',
        }}>
          {m.error && <p style={{ fontSize: 13, color: '#c5221f' }}>{m.error}</p>}

          {!m.error && !m.result && (
            <p style={{ fontSize: 12.5, color: C.muted, textAlign: 'center', maxWidth: '38ch' }}>
              {m.rendering
                ? 'Going through the archive for the closest photograph to every square. A minute or so.'
                : 'The mosaic turns up here.'}
            </p>
          )}

          {m.result && (
            <>
              <img
                src={m.result.url}
                alt="The finished mosaic"
                style={{ width: '100%', borderRadius: 8, display: 'block' }}
              />
              {m.result.meta && <Meta meta={m.result.meta} />}
              <a
                href={m.result.url}
                download="mosaic.jpg"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 10,
                  height: 32, padding: '0 14px', borderRadius: 16, fontSize: 12.5,
                  border: `1px solid ${C.border}`, color: C.text, textDecoration: 'none',
                }}
              >
                <Download size={14} /> Save it
              </a>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

function Estimate({ estimate, settings }) {
  return (
    <div style={{
      padding: 10, marginBottom: 10, borderRadius: 10,
      background: C.surface, fontSize: 11.5, color: C.muted,
      fontVariantNumeric: 'tabular-nums',
    }}>
      <div>
        up to {settings.grid.w} × {settings.grid.h} tiles —{' '}
        {estimate.width.toLocaleString()} × {estimate.height.toLocaleString()} px
      </div>
      <div>
        {estimate.megapixels.toFixed(1)} MP · {estimate.cells.toLocaleString()} squares ·{' '}
        at least {estimate.uniquePhotos.toLocaleString()} different photographs
      </div>
      <div style={{ marginTop: 3 }}>
        One side may come in smaller to keep the original's shape. Nothing is stretched.
      </div>
    </div>
  )
}

function Meta({ meta }) {
  const short = n => (n == null ? '—' : n.toLocaleString())
  return (
    <div style={{ fontSize: 11.5, color: C.muted, marginTop: 10, lineHeight: 1.6 }}>
      <div>
        {meta.grid_w}×{meta.grid_h} · {meta.tile_size}px tiles ·{' '}
        {short(meta.unique_tiles)} different photographs out of {short(meta.pool_size)} ·{' '}
        {(meta.render_ms / 1000).toFixed(1)}s
      </div>
      {meta.out_w && (
        <div>
          {short(meta.out_w)} × {short(meta.out_h)} px ·{' '}
          {((meta.out_w * meta.out_h) / 1e6).toFixed(1)} MP ·{' '}
          {(meta.file_size_bytes / 1e6).toFixed(1)} MB
        </div>
      )}
      {meta.solid_fallbacks > 0 && (
        <div style={{ color: '#a15c00' }}>
          {short(meta.solid_fallbacks)} squares ({((meta.solid_fallbacks / meta.cells) * 100).toFixed(1)}%)
          came out as flat colour — nothing left in the archive matched, at that colour, without repeating.
        </div>
      )}
    </div>
  )
}

const link = {
  border: 0, background: 'transparent', color: C.activeText,
  fontSize: 12.5, cursor: 'pointer', padding: '8px 0 0',
}

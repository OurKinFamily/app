import { PersonSearch } from '../faces/PersonSearch'
import { Avatar } from '../Avatar'
import { GRIDS, PRINTS } from '../../lib/useMosaic'
import { displayName } from '../../lib/people'
import { mediaUrl } from '../../lib/media'
import { C } from '../tokens'

/** Everything the density presets decide for you, laid open. */
export function MosaicControls({ settings, set, printPreset, applyPrint, include, setInclude, exclude, setExclude }) {
  const { grid, tileSize, maxReuse, shape, colorDistance, edgeAware, sourceSmooth, crop } = settings

  return (
    <>
      <Panel title="Print size" note="Sized for about 320 DPI in the frame. Sets the grid, the tiles and the reuse.">
        <div style={{ display: 'grid', gap: 5 }}>
          {PRINTS.map(p => (
            <Choice key={p.id} on={printPreset === p.id} onClick={() => applyPrint(p)} block>
              <div style={{ fontSize: 12.5 }}>{p.label}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{p.sub}</div>
            </Choice>
          ))}
        </div>
      </Panel>

      <Panel title="Grid">
        <div style={{ display: 'grid', gap: 5 }}>
          {GRIDS.map(g => (
            <Choice
              key={g.label}
              on={grid.w === g.w && grid.h === g.h}
              onClick={() => set({ grid: g })}
              block
            >
              <span style={{ fontSize: 12.5 }}>{g.label}</span>
            </Choice>
          ))}
        </div>
        <Field label="Tile size, in pixels">
          <input
            type="number" min={16} max={128} value={tileSize}
            onChange={e => set({ tileSize: Number(e.target.value) })}
            style={input}
          />
        </Field>
      </Panel>

      <Panel
        title="Only these people"
        note="Build it out of photographs one of them appears in. Empty means the whole archive."
      >
        <PersonSearch
          placeholder="Search…"
          onPick={p => setInclude(prev => prev.some(x => x.id === p.id) ? prev : [...prev, p])}
        />
        <Chips people={include} onRemove={id => setInclude(prev => prev.filter(p => p.id !== id))} />
      </Panel>

      <Panel
        title="But never these"
        note="Drops any photograph one of them is in. Pairs with the list above — Cayce and Stephen, but not with Henry in the frame."
      >
        <PersonSearch
          placeholder="Search…"
          onPick={p => setExclude(prev => prev.some(x => x.id === p.id) ? prev : [...prev, p])}
        />
        <Chips
          people={exclude}
          tone="#c5221f"
          onRemove={id => setExclude(prev => prev.filter(p => p.id !== id))}
        />
      </Panel>

      <Panel title="How each tile is cropped" note="Busiest quadrant keeps faces whole more often than the centre does.">
        <Row>
          {[['center', 'Centre'], ['saliency', 'Busiest quadrant']].map(([id, label]) => (
            <Choice key={id} on={crop === id} onClick={() => set({ crop: id })}>{label}</Choice>
          ))}
        </Row>
      </Panel>

      <Panel title="Source smoothing" note="Take each cell's colour from an N×N patch rather than a single pixel.">
        <Row>
          {[1, 3, 5].map(n => (
            <Choice key={n} on={sourceSmooth === n} onClick={() => set({ sourceSmooth: n })}>
              {n === 1 ? 'Off' : `${n}×${n}`}
            </Choice>
          ))}
        </Row>
      </Panel>

      <Panel title="Edge aware" note="Busy tiles where the source has edges, flat ones where it does not. Sharper faces.">
        <Row>
          {[[true, 'On'], [false, 'Off']].map(([v, label]) => (
            <Choice key={label} on={edgeAware === v} onClick={() => set({ edgeAware: v })}>{label}</Choice>
          ))}
        </Row>
      </Panel>

      <Panel title="Colour matching" note="LAB matches the way an eye sees. RGB is the naive one, kept to compare against.">
        <Row>
          {['lab', 'rgb'].map(c => (
            <Choice key={c} on={colorDistance === c} onClick={() => set({ colorDistance: c })}>
              {c.toUpperCase()}
            </Choice>
          ))}
        </Row>
      </Panel>

      <Panel title="Tile shape">
        <Row>
          {['square', 'hex', 'dot'].map(s => (
            <Choice key={s} on={shape === s} onClick={() => set({ shape: s })}>
              <span style={{ textTransform: 'capitalize' }}>{s}</span>
            </Choice>
          ))}
        </Row>
      </Panel>

      <Panel title="Repeats" note="How many times one photograph may be used. Lower means more of the archive appears, and a looser colour match.">
        <input
          type="number" min={1} max={200} value={maxReuse}
          onChange={e => set({ maxReuse: Number(e.target.value) })}
          style={input}
        />
      </Panel>
    </>
  )
}

function Chips({ people, onRemove, tone = C.activeText }) {
  if (!people.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
      {people.map(p => (
        <span key={p.id} style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '2px 4px 2px 2px', borderRadius: 999,
          border: `1px solid ${C.border}`, fontSize: 11.5,
        }}>
          <Avatar name={displayName(p)} src={p.avatar ? mediaUrl(p.avatar) : null} size={18} />
          {displayName(p)}
          <button
            type="button"
            onClick={() => onRemove(p.id)}
            aria-label={`Remove ${displayName(p)}`}
            style={{
              border: 0, background: 'transparent', color: tone,
              cursor: 'pointer', padding: '0 3px', fontSize: 13, lineHeight: 1,
            }}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  )
}

function Panel({ title, note, children }) {
  return (
    <section style={{
      padding: 12, marginBottom: 10, borderRadius: 10,
      border: `1px solid ${C.border}`, background: C.bg,
    }}>
      <h3 style={{ fontSize: 12.5, fontWeight: 500, margin: '0 0 4px' }}>{title}</h3>
      {note && <p style={{ fontSize: 11, color: C.muted, margin: '0 0 8px', lineHeight: 1.45 }}>{note}</p>}
      {children}
    </section>
  )
}

const Row = ({ children }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{children}</div>
)

function Choice({ on, onClick, children, block }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: block ? 'block' : 'inline-block',
        width: block ? '100%' : 'auto', textAlign: block ? 'left' : 'center',
        padding: '6px 10px', borderRadius: 8, font: 'inherit', fontSize: 12.5,
        border: `1px solid ${on ? C.activeText : C.border}`,
        background: on ? C.activeBg : C.bg,
        color: on ? C.activeText : C.text,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginTop: 8 }}>
      <span style={{ display: 'block', fontSize: 11.5, color: C.muted, marginBottom: 3 }}>{label}</span>
      {children}
    </label>
  )
}

const input = {
  width: '100%', boxSizing: 'border-box', height: 30, padding: '0 8px',
  border: `1px solid ${C.border}`, borderRadius: 8,
  font: 'inherit', fontSize: 12.5, color: C.text, background: C.bg,
}

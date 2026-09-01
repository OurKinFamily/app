import { useEffect, useState } from 'react'
import { Search, Star, Trash2, Share2, MoreVertical } from 'lucide-react'
import { MediaTile } from '../ui/MediaTile'
import { mediaTileProps } from '../ui/mediaTileProps'
import { C } from '../ui/tokens'

/**
 * v2 living style guide.
 *
 * The v2 counterpart of /design. Right now the skin's decisions live inline in
 * V2Layout; this page is where they get pulled out and named as they settle.
 * Anything that appears twice in the app should end up documented here first.
 */

function Section({ title, note, children }) {
  return (
    <section style={{ marginBottom: 56 }}>
      <h2 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 4px' }}>{title}</h2>
      {note && (
        <p style={{ fontSize: 13, color: C.muted, margin: '0 0 20px', maxWidth: '62ch' }}>
          {note}
        </p>
      )}
      {children}
    </section>
  )
}

function Swatch({ name, value }) {
  return (
    <div style={{ width: 132 }}>
      <div
        style={{
          height: 64, borderRadius: 8, background: value,
          border: `1px solid ${C.border}`,
        }}
      />
      <div style={{ fontSize: 12, marginTop: 8, fontWeight: 500 }}>{name}</div>
      <div style={{ fontSize: 11, color: C.muted, fontFamily: 'ui-monospace, monospace' }}>
        {value}
      </div>
    </div>
  )
}

// Header actions, sidebar pills and dialog buttons are all circular icon
// buttons at three sizes; this is the shape they share.
function IconButton({ icon: Icon, label, size = 48, tone = 'default' }) {
  const fg = tone === 'active' ? C.activeText : C.muted
  const bg = tone === 'active' ? C.activeBg : 'transparent'
  return (
    <button
      aria-label={label}
      title={label}
      style={{
        display: 'grid', placeItems: 'center',
        width: size, height: size, borderRadius: '50%',
        border: 0, background: bg, color: fg, cursor: 'pointer',
      }}
    >
      <Icon size={size <= 36 ? 18 : 20} />
    </button>
  )
}

export function V2ComponentsPage() {
  return (
    <div style={{ maxWidth: 880 }}>
      <h1 style={{ fontSize: 22, fontWeight: 400, margin: '16px 0 8px' }}>
        Components
      </h1>
      <p style={{ fontSize: 13, color: C.muted, margin: '0 0 48px', maxWidth: '62ch' }}>
        The v2 skin, as decided so far. Deliberately thin — things arrive here
        once they've been used twice, rather than being designed in advance.
      </p>

      <Section
        title="Colour"
        note="A warm neutral ramp with one accent. The accent is currently Google's
              blue, which is a placeholder rather than a decision — a family archive
              may want something less corporate."
      >
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {Object.entries(C).map(([k, v]) => <Swatch key={k} name={k} value={v} />)}
        </div>
      </Section>

      <Section
        title="Type"
        note="Google Sans where available, falling back to Roboto then the system
              stack. Weights stay light: 400 for nearly everything, 500 to mark
              emphasis. No bold."
      >
        <div style={{ display: 'grid', gap: 14 }}>
          {[
            ['Page title', 22, 400],
            ['Section heading', 16, 500],
            ['Body', 14, 400],
            ['Secondary / meta', 13, 400],
            ['Label', 12, 500],
          ].map(([label, size, weight]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
              <span style={{ width: 170, fontSize: 12, color: C.muted, flexShrink: 0 }}>
                {size}px / {weight}
              </span>
              <span style={{ fontSize: size, fontWeight: weight }}>{label}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Search field"
        note="The header's centre of gravity, and the strongest single cue of the
              overall look. Pill-shaped, on the surface tone, no border."
      >
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            height: 48, padding: '0 20px', maxWidth: 560,
            background: C.surface, borderRadius: 24,
          }}
        >
          <Search size={20} color={C.muted} />
          <input
            placeholder="Search your archive"
            style={{ flex: 1, border: 0, outline: 0, background: 'transparent',
                     fontSize: 16, color: C.text }}
          />
        </div>
      </Section>

      <Section
        title="Icon buttons"
        note="Circular, transparent until hovered. 48px in the header, 36px inside
              dense rows."
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconButton icon={Star} label="Favourite" />
          <IconButton icon={Share2} label="Share" />
          <IconButton icon={Trash2} label="Delete" />
          <IconButton icon={Star} label="Favourited" tone="active" />
          <span style={{ width: 24 }} />
          <IconButton icon={Star} label="Favourite, dense" size={36} />
          <IconButton icon={Share2} label="Share, dense" size={36} />
        </div>
      </Section>

      <Section
        title="Nav pill"
        note="Rounded on the right only and flush to the left edge, so the rail reads
              as continuing off-screen. Copied from Google Photos on purpose."
      >
        <div style={{ width: 256, background: C.bg, paddingTop: 4 }}>
          {[['Photos', true], ['Albums', false], ['People', false]].map(([label, active]) => (
            <div
              key={label}
              style={{
                display: 'flex', alignItems: 'center', gap: 20,
                padding: '0 24px 0 26px', height: 48, marginRight: 12,
                borderRadius: '0 24px 24px 0',
                background: active ? C.activeBg : 'transparent',
                color: active ? C.activeText : C.text,
                fontWeight: active ? 500 : 400,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Media tile"
        note="The one tile — used anywhere media appears in a list or grid. Fills the
              box it is given; no radius, no border. The dominant colour stands in
              until the photo arrives, and stays if it never does. Tab through them:
              each is a real button, so Enter and Space both work."
      >
        <MediaTileDemo />
      </Section>

    </div>
  )
}


/** One photo and one video, so each tile can be looked at on its own. */
function MediaTileDemo() {
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(() => new Set())
  const [opened, setOpened] = useState(null)

  useEffect(() => {
    // Grab a batch and pick one of each rather than assuming the first few
    // happen to include a video.
    fetch('/api/gallery?limit=60')
      .then(r => (r.ok ? r.json() : { media: [] }))
      .then(d => {
        const all = d.media || []
        const photo = all.find(m => !m.is_video)
        const video = all.find(m => m.is_video)
        setItems([photo, video].filter(Boolean))
      })
      .catch(() => {})
  }, [])

  const toggle = path => setSelected(prev => {
    const next = new Set(prev)
    next.has(path) ? next.delete(path) : next.add(path)
    return next
  })

  if (!items.length) {
    return <div style={{ fontSize: 13, color: C.muted }}>Loading…</div>
  }

  return (
    <>
      <div style={{ display: 'grid', gap: 24 }}>
        {items.map(it => (
          <div key={it.path}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>
              {it.is_video ? 'Video' : 'Photo'}
            </div>
            {/* A fixed box, since the grid isn't built yet — it will be the
                thing that works out each tile's width from the aspect ratio. */}
            <div style={{ width: 260, height: 190 }}>
              <MediaTile
                {...mediaTileProps(it)}
                selected={selected.has(it.path)}
                onClick={() => setOpened(it.filename)}
              >
                <MediaTile.Top justify="space-between">
                  {selected.has(it.path)
                    ? <MediaTile.Checkbox checked onChange={() => toggle(it.path)} />
                    : <MediaTile.OnHover>
                        <MediaTile.Checkbox onChange={() => toggle(it.path)} />
                      </MediaTile.OnHover>}
                  <MediaTile.OnHover>
                    <MediaTile.Control label="More"><MoreVertical size={14} /></MediaTile.Control>
                  </MediaTile.OnHover>
                </MediaTile.Top>
                {it.is_video && (
                  <MediaTile.Bottom justify="flex-end">
                    <span style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>0:42</span>
                  </MediaTile.Bottom>
                )}
              </MediaTile>
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: C.muted, marginTop: 16 }}>
        Tab to a tile and press Enter or Space to activate it; ↑ reaches the controls,
        ← → move between them, Esc returns. The checkbox selects — separate from
        activating, because the tile only emits a click and the caller decides what it
        means. {opened ? `Last activated: ${opened}` : ''}
      </p>
    </>
  )
}

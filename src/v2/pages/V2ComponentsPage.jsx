import { Link } from 'react-router-dom'
import { Search, Star, Trash2, Share2, ArrowRight } from 'lucide-react'
import { MediaTileDemo } from './MediaTileDemo'
import { MediaDetailDemo } from './MediaDetailDemo'
import { CollectionCardDemo } from './CollectionCardDemo'
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

      <Section
        title="Media details"
        note="One photograph, full size. A placeholder for now — the picture and a way
              out. It will be a route rendering as an overlay above the grid, so the
              URL changes while the grid stays mounted underneath and closing costs
              nothing."
      >
        <MediaDetailDemo />
      </Section>

      <Section
        title="Collection card"
        note="A container of photographs rather than one photograph — an album, a
              journal, a yearbook, a box of scans. The stack behind the cover is
              what separates it from a media tile at a glance. Two layouts share
              one set of props, so a view toggle is a one-word change. Told, not
              asking: it knows nothing about albums or routing, which is what
              lets Albums, Scrapbook and a person's collections all use it."
      >
        <CollectionCardDemo />
      </Section>

      <Section
        title="Grid"
        note="Justified rows built from the tile: packed by aspect ratio, each row
              scaled to fill the width exactly. It needs full width and a few hundred
              real photographs to judge, so it has its own page rather than being
              squeezed in here."
      >
        <Link
          to="/design/grid"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            height: 40, padding: '0 20px', borderRadius: 20,
            background: C.activeBg, color: C.activeText,
            fontSize: 14, fontWeight: 500, textDecoration: 'none',
          }}
        >
          Open the grid demo <ArrowRight size={16} />
        </Link>
      </Section>

    </div>
  )
}



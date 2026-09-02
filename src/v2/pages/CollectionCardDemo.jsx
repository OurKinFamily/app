import { useState } from 'react'
import { BookOpen, Camera, GraduationCap, Album, Lock, MoreVertical } from 'lucide-react'
import { CollectionCard } from '../ui/CollectionCard'
import { C } from '../ui/tokens'

/**
 * Collection cards, on frozen fixtures.
 *
 * The names, counts and covers are real — Cayce's journals, the 1978 yearbook,
 * the astrophotography — but copied rather than fetched. A style guide that
 * reads from the API stops being a reference the moment the data moves, and
 * these are the shapes the card has to survive: a nine-word yearbook title, a
 * 685-item collection, one with no cover at all, one with nothing in it.
 */

const thumb = path => `/api/media/thumb/${path}`

const FIXTURES = [
  {
    id: 'astro',
    title: 'Astro',
    subtitle: 'Astrophotography',
    count: 685,
    countLabel: 'photo',
    color: '#3c382c',
    icon: Camera,
    cover: thumb('heritage/stephen_e_young_3cf7e492-ca77-4e0a-814a-32619826d241/astro/0001-1750428098000.jpg'),
    description: 'Long exposures from the back garden, mostly of things that did not come out.',
  },
  {
    id: 'journal',
    title: 'Journal 2020–2024',
    subtitle: 'Journal',
    count: 375,
    countLabel: 'page',
    icon: BookOpen,
    cover: thumb('heritage/cayce_ward_young_e86a4c66-1df8-49ce-aca3-5b0ac64399b2/2020_01_01_2024_12_31_5yr/IMG_5423.JPG'),
  },
  {
    id: 'yearbook',
    // Nine words. The reason the title ellipses rather than wraps: three of
    // these side by side would otherwise sit at three different heights.
    title: 'Perkiomen Valley High School Yearbook, Class of 1978',
    subtitle: 'Yearbook',
    count: 193,
    countLabel: 'page',
    icon: GraduationCap,
    cover: thumb('heritage/stephen_d_young_fb6a2c6b-2386-49a8-96c9-00e062d09d59/perkiomen_valley_yearbook_1978/perkiomen78_0001.jpg'),
  },
  {
    id: 'nocover',
    title: 'Other Documents',
    subtitle: 'Documents',
    count: 1,
    countLabel: 'page',
    icon: Album,
    // No cover: falls back to the icon, which is why every caller passes one.
    cover: null,
  },
  {
    id: 'empty',
    title: 'Summer 2026',
    subtitle: 'Album · Private',
    count: 0,
    countLabel: 'photo',
    icon: Lock,
    cover: null,
    description: 'Nothing in it yet.',
  },
]

function GhostButton({ icon: Icon, label }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      style={{
        display: 'grid', placeItems: 'center', width: 28, height: 28,
        borderRadius: '50%', border: 0, cursor: 'pointer',
        background: 'rgba(0,0,0,.55)', color: '#fff',
      }}
    >
      <Icon size={15} />
    </button>
  )
}

export function CollectionCardDemo() {
  const [layout, setLayout] = useState('grid')
  const [opened, setOpened] = useState(null)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        {['grid', 'row'].map(mode => (
          <button
            key={mode}
            type="button"
            onClick={() => setLayout(mode)}
            style={{
              height: 30, padding: '0 12px', borderRadius: 15, fontSize: 13,
              cursor: 'pointer',
              border: `1px solid ${layout === mode ? 'transparent' : C.border}`,
              background: layout === mode ? C.activeBg : 'transparent',
              color: layout === mode ? C.activeText : C.text,
            }}
          >
            {mode === 'grid' ? 'Grid' : 'List'}
          </button>
        ))}
        <span style={{ fontSize: 12, color: C.muted }}>
          {opened ? `Opened: ${opened}` : 'Same props, both layouts.'}
        </span>
      </div>

      <div
        style={layout === 'grid'
          ? { display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }
          : { display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        {FIXTURES.map(f => (
          <CollectionCard
            key={f.id}
            {...f}
            layout={layout}
            coverAlt=""
            onClick={() => setOpened(f.title)}
          >
            {layout === 'grid' && (
              <CollectionCard.Actions>
                <GhostButton icon={MoreVertical} label={`More from ${f.title}`} />
              </CollectionCard.Actions>
            )}
          </CollectionCard>
        ))}
      </div>
    </div>
  )
}

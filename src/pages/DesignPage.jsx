import { useState } from 'react'
import { MapPin, Camera, ShieldCheck } from 'lucide-react'
import { EntityChip } from '../components/EntityChip'
import { EntityItem } from '../components/EntityItem'
import { MediaCard, MediaRow } from '../components/MediaCard'
import { BottomBar } from '../components/BottomBar'
import { SidebarNav } from '../components/SidebarNav'
import { Media } from '../components/Media'
import { MediaGallery } from '../components/MediaGallery'
import { MediaLightbox } from '../components/MediaLightbox'
import { Thumb } from '../components/Thumb'
import { MediaDetail } from '../components/MediaDetail'
import { Select } from '../components/Select'
import { Label } from '../components/Label'
import { Input } from '../components/Input'
import { Textarea } from '../components/Textarea'
import { Button } from '../components/Button'
import { AppShell } from '../components/AppShell'
import { Container } from '../components/Container'
import { DetailSection } from '../components/DetailSection'
import { Field } from '../components/Field'
import { Tag } from '../components/Tag'
import { ProgressBar } from '../components/ProgressBar'

const TAG_TONES = ['default', 'green', 'amber', 'red', 'blue', 'purple', 'pink', 'orange', 'slate', 'cyan']
import { MiniMap } from '../components/MiniMap'
import { Swatch } from '../components/Swatch'
import { mediaUrl } from '../lib/media'
import { displayName, otherName } from '../lib/people'
import { groupMeta } from '../lib/groups'
import { categoryLabel, categoryIcon, collectionCount } from '../lib/collections'

// real face crops from the archive (resolve via /api/media). Amy Mansell has no
// avatar on purpose — shows the initials fallback.
const PEOPLE = [
  { id: 1, name: 'Abby', avatar: '__faces/crops/2024/11/2024-11-02_15-01-41_002.mp4_face6.jpg' },
  { id: 2, name: 'Abella Gomes', avatar: '__faces/crops/2025/02/2025-02-15_11-02-47_001.jpg_face12.jpg' },
  { id: 3, name: 'Alex Neidermeir', known_as: 'Alex', avatar: '__faces/crops/2010/10/cayce_196_1.JPG_face0.jpg' },
  { id: 4, name: 'Angie Platt', known_as: 'Angie', avatar: '__faces/crops/2022/01/2022-01-01_00-00-00_066.jpg_face0.jpg' },
  { id: 5, name: 'Amanda Gamble', avatar: '__faces/crops/2015/01/2015-01-01_00-00-00_725.jpg_face5.jpg' },
  { id: 6, name: 'Amy Mansell' },
]

const GROUPS = [
  { id: 1, name: 'Crowell School', type: 'school', location_name: 'Haverhill, Essex County', role: 'Student' },
  { id: 2, name: 'Paint Nite, LLC', type: 'workplace', location_name: 'Somerville, Middlesex County' },
  { id: 3, name: 'YMCA', type: 'fitness', location_name: 'Plaistow, Rockingham County' },
  { id: 4, name: 'Timberlane Regional', type: 'school', location_name: 'Plaistow, Rockingham County', role: 'Student' },
]

// real collections from the archive (Stephen E. Young's scrapbook). cover_path resolves
// via /api/media. "Other Documents" cover cleared on purpose -> muted-box fallback.
const HBASE = 'heritage/stephen_e_young_3cf7e492-ca77-4e0a-814a-32619826d241'

const COLLECTIONS = [
  { id: 1, name: 'Baby Book', category: 'baby_book', item_count: 34, is_series: true, cover_path: `${HBASE}/baby_book/001-1751828227535.jpg` },
  { id: 2, name: 'Chooljian Home Movies', category: 'home_movies', item_count: 111, is_series: false, cover_path: 'archive/1962/07/1962-07_chooljians_backyard_gathering_loving_memory.mp4.poster.jpg', description: 'Chooljian family home movies, 1950s–1970s (8mm/16mm reels)' },
  { id: 3, name: 'Hospital Documents 1986', category: 'medical_records', item_count: 10, is_series: false, cover_path: `${HBASE}/hospital_docs_1986/1751833944704-hospital-docs.jpg` },
  { id: 4, name: 'Language Arts Journal, 7th Grade 1998-1999', category: 'school_papers', item_count: 104, is_series: true, cover_path: `${HBASE}/stephen_journal/language_arts_journal/1998-09-01-language-arts-journal-page-06.jpg`, description: '7th grade language arts class journal, Timberlane Regional Middle School, 1998-1999' },
  { id: 5, name: 'Newspaper — April 15, 1986', category: 'newspaper', item_count: 7, is_series: false, cover_path: `${HBASE}/newspaper_1986/1751831520103-newspaper.jpg` },
  { id: 6, name: 'Other Documents', category: 'documents', item_count: 23, is_series: false, cover_path: null },
  { id: 7, name: 'Personal Diary 1999', category: 'letters', item_count: 30, is_series: false, cover_path: `${HBASE}/stephen_journal/personal_diary_1999/1999-03-29.jpg`, description: 'Personal diary entries, spring/summer 1999' },
]

// real unidentified face crops (crop_url is already a full /api/media path)
const FACES = Array.from({ length: 11 }, (_, i) => ({
  face_index: i,
  crop_url: `/api/media/__faces/crops/2026/05/2026-05-01_18-16-50_001.mov_face${i}.jpg`,
}))

const avatarSrc = p => (p.avatar ? mediaUrl(p.avatar) : null)

// Select option sets — avatar/initials (people) and icon (categories)
const PERSON_OPTIONS = PEOPLE.map(p => ({
  value: p.id,
  text: p.name,
  avatar: avatarSrc(p),
  initials: true,
  label: (
    <>
      {p.known_as && p.known_as !== p.name && <span className="text-white/35">({p.known_as}) </span>}
      {p.name}
    </>
  ),
}))

const CAT_OPTIONS = ['baby_book', 'home_movies', 'medical_records', 'school_papers', 'newspaper', 'documents', 'letters'].map(c => {
  const Icon = categoryIcon(c)
  return { value: c, text: categoryLabel(c), label: categoryLabel(c), icon: <Icon size={16} /> }
})

// real gallery thumbnails + true dimensions (thumbnail_url is already a full /api/media path)
const MEDIA = [
  { path: 'v1', thumbnail_url: '/api/media/thumb/2026/05/2026-05-01_20-22-02_001.mov', is_video: true, width: 337, height: 600 },
  { path: 'v2', thumbnail_url: '/api/media/thumb/2026/05/2026-05-01_20-02-47_001.mov', is_video: true, width: 337, height: 600 },
  { path: 'p1', thumbnail_url: '/api/media/thumb/2026/05/2026-05-01_16-22-32_001.jpg', dominant_color: '#18151a', width: 338, height: 600 },
  { path: 'p2', thumbnail_url: '/api/media/thumb/2026/05/2026-05-01_16-22-30_002.jpg', dominant_color: '#171418', width: 338, height: 600 },
  { path: 'p3', thumbnail_url: '/api/media/thumb/2026/05/2026-05-01_16-22-30_001.jpg', dominant_color: '#171417', width: 338, height: 600 },
  { path: 'p4', thumbnail_url: '/api/media/thumb/2026/05/2026-05-01_16-22-24_002.jpg', dominant_color: '#251f24', width: 338, height: 600 },
  { path: 'p5', thumbnail_url: '/api/media/thumb/2026/05/2026-05-01_16-22-24_001.jpg', dominant_color: '#e77d30', width: 338, height: 600 },
  { path: 'p6', thumbnail_url: '/api/media/thumb/2026/05/2026-05-01_16-22-23_001.jpg', dominant_color: '#17161b', width: 338, height: 600 },
  { path: 'p7', thumbnail_url: '/api/media/thumb/2026/05/2026-05-01_16-22-19_001.jpg', dominant_color: '#282424', width: 338, height: 600 },
  { path: 'p8', thumbnail_url: '/api/media/thumb/2026/05/2026-05-01_16-22-18_001.jpg', dominant_color: '#231e1f', width: 338, height: 600 },
  { path: 'p9', thumbnail_url: '/api/media/thumb/2026/05/2026-05-01_16-22-15_001.jpg', dominant_color: '#1e1d21', width: 338, height: 600 },
  { path: 'p10', thumbnail_url: '/api/media/thumb/2026/05/2026-05-01_16-21-49_001.jpg', dominant_color: '#16151b', width: 600, height: 450 },
].map(m => {
  const url = m.thumbnail_url.replace('/thumb/', '/archive/')
  return { ...m, url, path: url.replace('/api/media/', '') }
})

function Section({ title, children }) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-white/30">{title}</h2>
      {children}
    </section>
  )
}

function TypeRow({ label, children }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-white/5 py-3">
      <div className="w-32 shrink-0 font-mono text-[10px] text-white/25">{label}</div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

const SAMPLE = 'The five Young children gathered by the lake.'

export function DesignPage() {
  const noop = () => {}
  const [favs, setFavs] = useState(() => new Set([MEDIA[0].path, MEDIA[3].path, MEDIA[5].path]))
  const toggleFav = it => setFavs(s => {
    const n = new Set(s)
    n.has(it.path) ? n.delete(it.path) : n.add(it.path)
    return n
  })

  const [selFace, setSelFace] = useState(null)
  const [selPerson, setSelPerson] = useState(null)
  const [selCat, setSelCat] = useState(null)
  const [multiPeople, setMultiPeople] = useState([])
  const [multiCats, setMultiCats] = useState([])

  // same lightbox shell for both: a single media item and a collection (its pages).
  const [viewer, setViewer] = useState(null)
  const openMedia = it => setViewer({ items: MEDIA, index: MEDIA.findIndex(m => m.path === it.path) })
  const openCollection = c => setViewer({ items: MEDIA, index: 0, title: `${c.name} · ${collectionCount(c)}` })
  return (
    <div className="min-h-screen p-8">
      <h1 className="mb-10 text-3xl font-semibold text-white">Design</h1>

      <Section title="Typography — headings">
        <div className="max-w-2xl">
          <TypeRow label="h1 · 4xl bold"><h1 className="text-4xl font-bold text-white">{SAMPLE}</h1></TypeRow>
          <TypeRow label="h2 · 3xl semibold"><h2 className="text-3xl font-semibold text-white">{SAMPLE}</h2></TypeRow>
          <TypeRow label="h3 · 2xl semibold"><h3 className="text-2xl font-semibold text-white">{SAMPLE}</h3></TypeRow>
          <TypeRow label="h4 · xl medium"><h4 className="text-xl font-medium text-white">{SAMPLE}</h4></TypeRow>
          <TypeRow label="h5 · lg medium"><h5 className="text-lg font-medium text-white">{SAMPLE}</h5></TypeRow>
          <TypeRow label="h6 · sm semibold caps"><h6 className="text-sm font-semibold uppercase tracking-wider text-white/80">{SAMPLE}</h6></TypeRow>
        </div>
      </Section>

      <Section title="Typography — body">
        <div className="max-w-2xl">
          <TypeRow label="body-lg · base"><p className="text-base text-white/80">{SAMPLE}</p></TypeRow>
          <TypeRow label="body · sm"><p className="text-sm text-white/70">{SAMPLE}</p></TypeRow>
          <TypeRow label="body-sm · xs"><p className="text-xs text-white/60">{SAMPLE}</p></TypeRow>
          <TypeRow label="caption · 11px"><p className="text-[11px] text-white/40">{SAMPLE}</p></TypeRow>
          <TypeRow label="label · 10px caps"><p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Section label</p></TypeRow>
        </div>
      </Section>

      <Section title="Tag — pill variant (all tones)">
        <div className="flex flex-wrap gap-2">
          {TAG_TONES.map(t => <Tag key={t} tone={t}>{t}</Tag>)}
        </div>
      </Section>

      <Section title="Tag — plain variant (color-only text, no pill bg — replaces old Badge)">
        <div className="flex flex-wrap gap-3">
          {TAG_TONES.map(t => <Tag key={t} tone={t} variant="plain">{t}</Tag>)}
        </div>
      </Section>

      <Section title="Tag — custom color (pass any hex / css color)">
        <div className="flex flex-wrap gap-2">
          <Tag color="#f43f5e">#f43f5e</Tag>
          <Tag color="#14b8a6">#14b8a6</Tag>
          <Tag color="#facc15">#facc15</Tag>
          <Tag color="#a78bfa">#a78bfa</Tag>
          <Tag color="#84cc16">#84cc16</Tag>
          <Tag color="#fb923c">#fb923c</Tag>
          <Tag color="rebeccapurple">rebeccapurple</Tag>
        </div>
      </Section>

      <Section title="Tag — example usage (status chip + inline meta)">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-white/70">
            Confidence: <Tag tone="green" className="ml-1 uppercase">high</Tag>
          </p>
          <p className="text-sm text-white/70">
            John Smith <Tag tone="amber" variant="plain" className="ml-2">Workplace</Tag>
          </p>
          <div className="flex flex-wrap gap-2">
            <Tag tone="green">Sports Team</Tag>
            <Tag tone="blue">School</Tag>
            <Tag tone="amber">Workplace</Tag>
            <Tag tone="orange">Neighborhood</Tag>
            <Tag tone="purple">Religious</Tag>
            <Tag tone="pink">Family Friend</Tag>
            <Tag tone="cyan">Hobby / Club</Tag>
            <Tag tone="slate">Civic</Tag>
          </div>
        </div>
      </Section>

      <Section title="ProgressBar — sizes, tones, with/without chips">
        <div className="flex max-w-md flex-col gap-5">
          <div>
            <p className="mb-1 text-[11px] text-white/30">size=sm · tone=blue · 23%</p>
            <ProgressBar pct={23} size="sm" />
          </div>
          <div>
            <p className="mb-1 text-[11px] text-white/30">size=md · tone=green · 78% · with pct + counts</p>
            <ProgressBar pct={78} tone="green" cur={7823} tot={10000} showPct showCounts />
          </div>
          <div>
            <p className="mb-1 text-[11px] text-white/30">size=lg · tone=amber · 100%</p>
            <ProgressBar pct={100} tone="amber" size="lg" showPct />
          </div>
          <div>
            <p className="mb-1 text-[11px] text-white/30">size=md · tone=red · 12% · counts only</p>
            <ProgressBar pct={12} tone="red" cur={123} tot={1024} showCounts />
          </div>
          <div>
            <p className="mb-1 text-[11px] text-white/30">size=md · tone=purple · 50%</p>
            <ProgressBar pct={50} tone="purple" showPct showCounts cur={500} tot={1000} />
          </div>
        </div>
      </Section>

      <Section title="Select — single (avatar / initials / icon options)">
        <div className="flex max-w-sm flex-col gap-4">
          <Select options={PERSON_OPTIONS} value={selPerson?.value} onChange={setSelPerson} placeholder="Search people…" />
          <Select options={CAT_OPTIONS} value={selCat?.value} onChange={setSelCat} placeholder="Choose a category…" />
        </div>
      </Section>

      <Section title="Select — multi (removable chips + checkmarks)">
        <div className="flex max-w-sm flex-col gap-4">
          <Select multiple options={PERSON_OPTIONS} value={multiPeople.map(o => o.value)} onChange={setMultiPeople} placeholder="Add people…" />
          <Select multiple options={CAT_OPTIONS} value={multiCats.map(o => o.value)} onChange={setMultiCats} placeholder="Add categories…" />
        </div>
      </Section>

      <Section title="Form fields (Label / Input / Textarea)">
        <div className="max-w-sm space-y-4">
          <div>
            <Label htmlFor="ex-name" required>Full name</Label>
            <Input id="ex-name" placeholder="e.g. Margaret Young" />
          </div>
          <div>
            <Label htmlFor="ex-year" hint="(optional)">Birth year</Label>
            <Input id="ex-year" placeholder="e.g. 1942" />
          </div>
          <div>
            <Label htmlFor="ex-email" required>Email</Label>
            <Input id="ex-email" error defaultValue="not-an-email" />
            <p className="mt-1.5 text-[11px] text-red-400">Enter a valid email address.</p>
          </div>
          <div>
            <Label htmlFor="ex-notes" hint="(optional)">Notes</Label>
            <Textarea id="ex-notes" rows={3} placeholder="Anything worth remembering…" />
          </div>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Delete</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
        </div>
      </Section>

      <Section title="AppShell — header + sidebar (desktop) + content + bottomBar (mobile)">
        <div className="h-[480px] overflow-hidden rounded-lg border border-white/10">
          <AppShell
            className="min-h-full"
            header={<div className="border-b border-white/10 bg-black/40 px-4 py-2 text-[12px] text-white/55">Header</div>}
            sidebar={<div className="h-full w-44 border-r border-white/10 p-3"><SidebarNav /></div>}
            bottomBar={<BottomBar />}
          >
            <Container className="py-6 text-[12px] text-white/40">Main content (inside a Container)</Container>
          </AppShell>
        </div>
      </Section>

      <Section title="Container — centered max-width column">
        <div className="rounded-lg border border-white/10">
          <Container className="py-6 text-[12px] text-white/40">Centered max-w-6xl content with responsive padding</Container>
        </div>
      </Section>

      <Section title="BottomBar">
        <div className="w-full max-w-sm border border-white/10">
          <BottomBar />
        </div>
      </Section>

      <Section title="SidebarNav (ul/nav/links — goes in the sidebar)">
        <div className="w-60 border border-white/10 p-3">
          <SidebarNav />
        </div>
      </Section>

      <Section title="EntityChip · person (avatar) + group (text-only)">
        <div className="flex flex-wrap gap-2">
          {PEOPLE.map(p => (
            <EntityChip key={p.id} avatar={avatarSrc(p)} initials text={displayName(p)} onClick={noop} />
          ))}
          {GROUPS.map(g => (
            <EntityChip key={g.id} text={g.name} onClick={noop} />
          ))}
        </div>
      </Section>

      <Section title="EntityChip · with caption (small dim line below text)">
        <div className="flex flex-wrap gap-2">
          {PEOPLE.slice(0, 4).map((p, i) => (
            <EntityChip
              key={p.id}
              avatar={avatarSrc(p)}
              initials
              text={displayName(p)}
              caption={['Parent', 'Spouse', 'Sibling', 'Child'][i]}
              onClick={noop}
            />
          ))}
        </div>
      </Section>

      <Section title="EntityChip · removable (hover to reveal × in top-right corner)">
        <div className="flex flex-wrap gap-2">
          {PEOPLE.slice(0, 4).map(p => (
            <EntityChip
              key={p.id}
              avatar={avatarSrc(p)}
              initials
              text={displayName(p)}
              onClick={noop}
              onRemove={noop}
            />
          ))}
          {GROUPS.slice(0, 2).map(g => (
            <EntityChip key={g.id} text={g.name} onClick={noop} onRemove={noop} />
          ))}
        </div>
      </Section>

      <Section title="EntityChip · caption + removable (combined)">
        <div className="flex flex-wrap gap-2">
          {PEOPLE.slice(0, 3).map((p, i) => (
            <EntityChip
              key={p.id}
              avatar={avatarSrc(p)}
              initials
              text={displayName(p)}
              caption={['Parent', 'Sibling', 'Child'][i]}
              onClick={noop}
              onRemove={noop}
            />
          ))}
        </div>
      </Section>

      <Section title="EntityItem · person card (in a grid)">
        <div className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          {PEOPLE.map(p => (
            <EntityItem key={p.id} avatar={avatarSrc(p)} initials text={displayName(p)} secondary={otherName(p)} onClick={noop} />
          ))}
        </div>
      </Section>

      <Section title="EntityItem · person row (in a stack, w/ slots)">
        <div className="max-w-2xl space-y-2">
          <EntityItem
            initials
            text="Ashley Smith"
            secondary={<span>Childhood Friend <span className="text-white/30">via Crowell School</span></span>}
            onClick={noop}
          />
          <EntityItem
            initials
            text="Dima"
            secondary={<span>Close Friend <span className="text-white/30">via Timberlane Regional</span></span>}
            trailing="1997"
            onClick={noop}
          />
        </div>
      </Section>

      <Section title="EntityItem · group card (in a grid)">
        <div className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          {GROUPS.map(g => (
            <EntityItem key={g.id} text={g.name} secondary={groupMeta(g)} onClick={noop} />
          ))}
        </div>
      </Section>

      <Section title="EntityItem · group row (in a stack, w/ role badge + trailing)">
        <div className="max-w-2xl space-y-2">
          {GROUPS.map(g => (
            <EntityItem key={g.id} text={g.name} badge={g.role} secondary={groupMeta(g)} trailing={g.id === 1 ? '1998' : undefined} onClick={noop} />
          ))}
        </div>
      </Section>

      <Section title="EntityItem · same row in an auto-fill grid (use this for grid views; no special variant)">
        <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
          {PEOPLE.slice(0, 6).map(p => (
            <EntityItem key={p.id} avatar={avatarSrc(p)} initials text={displayName(p)} secondary={otherName(p)} onClick={noop} />
          ))}
        </div>
      </Section>

      <Section title="MediaCard · collection (grid). 'Other Documents' has no cover → muted-box fallback">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {COLLECTIONS.map(c => {
            const Icon = categoryIcon(c.category)
            return (
              <MediaCard
                key={c.id}
                cover={c.cover_path ? mediaUrl(c.cover_path) : null}
                coverBadge={collectionCount(c)}
                icon={<Icon size={13} />}
                text={c.name}
                subtitle={categoryLabel(c.category)}
                description={c.description}
                onClick={() => openCollection(c)}
              />
            )
          })}
        </div>
      </Section>

      <Section title="MediaRow · collection (row). Same props as MediaCard — drop-in swap for list view.">
        <div className="flex max-w-2xl flex-col gap-2">
          {COLLECTIONS.map(c => {
            const Icon = categoryIcon(c.category)
            return (
              <MediaRow
                key={c.id}
                cover={c.cover_path ? mediaUrl(c.cover_path) : null}
                coverBadge={collectionCount(c)}
                icon={<Icon size={18} />}
                text={c.name}
                subtitle={categoryLabel(c.category)}
                description={c.description}
                onClick={() => openCollection(c)}
              />
            )
          })}
        </div>
      </Section>


      <Section title="Media (single tile — fills its box; hover for heart)">
        <div className="grid w-full max-w-md grid-cols-4 gap-1.5">
          {MEDIA.slice(0, 4).map(it => (
            <div key={it.path} className="aspect-square">
              <Media thumb={it.thumbnail_url} isVideo={it.is_video} color={it.dominant_color} favorited={favs.has(it.path)} onFavorite={() => toggleFav(it)} onClick={() => openMedia(it)} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="MediaGallery (justified rows — perfect-fit, true aspect, hover to favorite, click to open)">
        <MediaGallery items={MEDIA} favorites={favs} onFavorite={toggleFav} onSelect={openMedia} />
      </Section>

      <Section title="Thumb — faces grid (lightbox detail; click to select)">
        <div className="flex max-w-md flex-wrap gap-1.5">
          {FACES.map(f => (
            <Thumb
              key={f.face_index}
              src={f.crop_url}
              selected={selFace === f.face_index}
              onClick={() => setSelFace(i => (i === f.face_index ? null : f.face_index))}
            />
          ))}
        </div>
      </Section>

      <Section title="DetailSection (isolated — divider only shows when stacked, not first-child)">
        <div className="max-w-md">
          <DetailSection title="Detected">
            <div className="flex flex-wrap gap-1.5">
              {['chair', 'couch', 'person', 'suitcase', 'teddy bear', 'tv'].map(o => <Tag key={o}>{o}</Tag>)}
            </div>
          </DetailSection>
        </div>
      </Section>

      <Section title="Tag (isolated)">
        <div className="flex flex-wrap gap-1.5">
          {['chair', 'couch', 'person', 'suitcase', 'teddy bear', 'tv'].map(o => <Tag key={o}>{o}</Tag>)}
        </div>
      </Section>

      <Section title="Field (isolated — label ↔ value; optional icon left of value)">
        <div className="max-w-xs">
          <Field label="Source" value="exif" icon={<ShieldCheck size={12} />} />
          <Field label="Confidence" value={<Tag tone="green" className="uppercase">high</Tag>} />
          <Field label="Location" value="Atkinson, NH" icon={<MapPin size={12} />} />
          <Field label="Camera" value="iPhone 15 Pro" icon={<Camera size={12} />} />
          <Field label="Format" value="quicktime" />
        </div>
      </Section>

      <Section title="MiniMap (isolated — Location)">
        <div className="max-w-md">
          <Field label="City" value="Atkinson, NH" />
          <Field label="GPS" value="42.84260, -71.11631" />
          <div className="mt-2">
            <MiniMap lat={42.8426} lng={-71.11631} />
          </div>
        </div>
      </Section>

      <Section title="Swatch (isolated — Colors)">
        <div className="max-w-xs">
          <Swatch color="#473a2f" label="Dominant" />
          <Swatch color="#715e53" label="Mean" />
          <Swatch color="#ebe7d8" label="Salient" />
        </div>
      </Section>

      <Section title="DetailSection + Field stacked (Camera / Exposure / File / Processing)">
        <div className="max-w-xs">
          <DetailSection title="Camera — Apple iPhone 15 Pro Max">
            <Field label="Lens" value="iPhone 15 Pro Max back triple camera 15.66mm f/2.8" />
          </DetailSection>
          <DetailSection title="Exposure">
            <Field label="ISO" value="160" />
            <Field label="Aperture" value="f/2.8" />
            <Field label="Shutter" value="1/60" />
            <Field label="Focal length" value="15.7 mm" />
            <Field label="Flash" value="Off, Did not fire" />
          </DetailSection>
          <DetailSection title="File">
            <Field label="Size" value="1.1 MB" />
            <Field label="Dimensions" value="3672 × 2066" />
            <Field label="Megapixels" value="7.6 MP" />
            <Field label="Format" value="jpeg" />
            <Field label="Orientation" value="Horizontal (normal)" />
          </DetailSection>
          <DetailSection title="Processing">
            <Field label="Processor" value="ImageProcessor" />
            <Field label="Extracted" value="May 2, 2026" />
          </DetailSection>
        </div>
      </Section>

      {viewer && (
        <MediaLightbox
          items={viewer.items}
          initialIndex={viewer.index}
          title={viewer.title}
          favorites={favs}
          onFavorite={toggleFav}
          onRotate={(it, deg) => console.log('rotate (mock — needs API)', it.path, deg)}
          onDownload={it => console.log('download (mock)', it.path)}
          onDelete={() => { console.log('delete (mock)'); setViewer(null) }}
          renderDetail={it => <MediaDetail key={it.path} item={it} />}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  )
}

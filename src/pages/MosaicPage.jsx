import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Container } from '../components/Container'
import { mediumUrl } from '../lib/media'

const GRID_PRESETS = [
  { label: 'Small   · 60 × 80',    w: 60,  h: 80  },
  { label: 'Medium  · 80 × 120',   w: 80,  h: 120 },
  { label: 'Large   · 120 × 160',  w: 120, h: 160 },
  { label: 'X-Large · 160 × 220',  w: 160, h: 220 },
]

// Simple-mode "Details" presets. One click = pre-baked params + render.
// Locked to mean colour, LAB matching, square, centre crop, 3×3 source
// smoothing, max_reuse 10 — combo confirmed via A/B during build.
const DETAIL_PRESETS = [
  { id: 'coarse',   label: 'Coarse',   grid: { w: 60,  h: 80  }, tile: 64, sub: '60 × 80 tiles · readable photos' },
  { id: 'fine',     label: 'Fine',     grid: { w: 80,  h: 120 }, tile: 64, sub: '80 × 120 tiles · balanced' },
  { id: 'veryfine', label: 'Veryfine', grid: { w: 120, h: 160 }, tile: 48, sub: '120 × 160 tiles · sharp source' },
]

// Tuned for ~320 DPI print at the listed size. Grid aspect matches the
// frame so the shop doesn't crop or letterbox.
const PRINT_PRESETS = [
  { id: 'p_11x14',  label: '11 × 14 framed', grid: { w: 50, h: 60  }, tile: 72, reuse: 6, sub: '3.6K × 4.3K · ~13 MP' },
  { id: 'p_16x20',  label: '16 × 20 print',  grid: { w: 60, h: 80  }, tile: 80, reuse: 6, sub: '4.8K × 6.4K · ~31 MP' },
  { id: 'p_18x24',  label: '18 × 24 poster', grid: { w: 80, h: 100 }, tile: 72, reuse: 5, sub: '5.8K × 7.2K · ~41 MP' },
  { id: 'p_24x36',  label: '24 × 36 poster', grid: { w: 80, h: 120 }, tile: 96, reuse: 4, sub: '7.7K × 11.5K · ~88 MP' },
]

export function MosaicPage() {
  const [params] = useSearchParams()
  const initialPath = params.get('source') || null

  const [sourceFile, setSourceFile] = useState(null)
  const [sourcePath, setSourcePath] = useState(initialPath)
  const [sourcePreview, setSourcePreview] = useState(
    initialPath ? mediumUrl(initialPath) : null
  )
  const [grid, setGrid] = useState(GRID_PRESETS[1])
  const [tileSize, setTileSize] = useState(48)
  const [maxReuse, setMaxReuse] = useState(8)
  const [shape, setShape] = useState('square')
  const [colorDistance, setColorDistance] = useState('lab')
  const [edgeAware, setEdgeAware] = useState(false)
  const [sourceSmooth, setSourceSmooth] = useState(1)
  const [crop, setCrop] = useState('center')
  const [advanced, setAdvanced] = useState(false)
  const [printPreset, setPrintPreset] = useState(null)
  const [people, setPeople] = useState([])           // include — [{id, name, avatar}]
  const [excludePeople, setExcludePeople] = useState([])  // exclude — [{id, name, avatar}]
  const [peopleSearch, setPeopleSearch] = useState('')
  const [peopleResults, setPeopleResults] = useState([])
  const [excludeSearch, setExcludeSearch] = useState('')
  const [excludeResults, setExcludeResults] = useState([])

  useEffect(() => {
    const q = peopleSearch.trim()
    if (q.length < 2) { setPeopleResults([]); return }
    let cancelled = false
    fetch(`/api/people/search?q=${encodeURIComponent(q)}&limit=10`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(rs => { if (!cancelled) setPeopleResults(rs) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [peopleSearch])

  function addPerson(p) {
    if (people.find(x => x.id === p.id)) return
    setPeople(prev => [...prev, { id: p.id, name: p.name, avatar: p.avatar }])
    setPeopleSearch('')
    setPeopleResults([])
  }

  function removePerson(id) {
    setPeople(prev => prev.filter(p => p.id !== id))
  }

  useEffect(() => {
    const q = excludeSearch.trim()
    if (q.length < 2) { setExcludeResults([]); return }
    let cancelled = false
    fetch(`/api/people/search?q=${encodeURIComponent(q)}&limit=10`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(rs => { if (!cancelled) setExcludeResults(rs) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [excludeSearch])

  function addExcludePerson(p) {
    if (excludePeople.find(x => x.id === p.id)) return
    setExcludePeople(prev => [...prev, { id: p.id, name: p.name, avatar: p.avatar }])
    setExcludeSearch('')
    setExcludeResults([])
  }

  function removeExcludePerson(id) {
    setExcludePeople(prev => prev.filter(p => p.id !== id))
  }

  function applyPrint(p) {
    setPrintPreset(p.id)
    setGrid(p.grid)
    setTileSize(p.tile)
    setMaxReuse(p.reuse)
  }

  const [renderUrl, setRenderUrl] = useState(null)
  const [rendering, setRendering] = useState(false)
  const [error, setError] = useState(null)
  const [meta, setMeta] = useState(null)

  function onPickFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setSourceFile(f)
    setSourcePath(null)
    setSourcePreview(URL.createObjectURL(f))
    setRenderUrl(null)
    setMeta(null)
  }


  async function onRender(overrides) {
    if (!sourceFile && !sourcePath) return
    const p = {
      grid_w:         grid.w,
      grid_h:         grid.h,
      tile_size:      tileSize,
      shape,
      color_distance: colorDistance,
      edge_aware:     edgeAware,
      source_smooth:  sourceSmooth,
      crop,
      max_reuse:      maxReuse,
      ...(overrides || {}),
    }
    setRendering(true)
    setError(null)
    setRenderUrl(null)
    setMeta(null)
    try {
      const fd = new FormData()
      if (sourceFile) fd.append('source', sourceFile)
      else            fd.append('source_path', sourcePath)
      fd.append('grid_w', p.grid_w)
      fd.append('grid_h', p.grid_h)
      fd.append('tile_size', p.tile_size)
      fd.append('color', 'mean')
      fd.append('max_reuse', p.max_reuse)
      fd.append('shape', p.shape)
      fd.append('color_distance', p.color_distance)
      fd.append('edge_aware', p.edge_aware ? 'true' : 'false')
      fd.append('source_smooth', p.source_smooth)
      fd.append('crop', p.crop)
      if (people.length) fd.append('person_ids', people.map(p2 => p2.id).join(','))
      if (excludePeople.length) fd.append('exclude_person_ids', excludePeople.map(p2 => p2.id).join(','))
      const res = await fetch('/api/admin/mosaic/render', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const metaHeader = res.headers.get('x-mosaic-meta')
      if (metaHeader) setMeta(JSON.parse(metaHeader))
      const blob = await res.blob()
      setRenderUrl(URL.createObjectURL(blob))
    } catch (e) {
      setError(String(e))
    } finally {
      setRendering(false)
    }
  }

  function applyDetail(d) {
    // Lock the "good combo" we found via A/B. Simple-mode users get this
    // every time; the only knob is grid density (= how detailed the
    // mosaic looks vs how readable each photo is).
    setGrid(d.grid)
    setTileSize(d.tile)
    setShape('square')
    setColorDistance('lab')
    setEdgeAware(false)
    setSourceSmooth(3)
    setCrop('center')
    setMaxReuse(10)
    setPrintPreset(null)
    onRender({
      grid_w: d.grid.w, grid_h: d.grid.h, tile_size: d.tile,
      shape: 'square', color_distance: 'lab', edge_aware: false,
      source_smooth: 3, crop: 'center', max_reuse: 10,
    })
  }

  return (
    <Container className="space-y-6 py-6">
      <div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-semibold text-white md:text-2xl">Mosaic</h1>
          <span className="rounded-full border border-purple-500/40 bg-purple-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-purple-300">
            POC
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-[13px] text-white/45">
          Rebuild any source image as a mosaic, each cell replaced by an archive
          photo whose color most closely matches that cell. Chuck-Close-style.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <div className="space-y-4">
          {/* Source */}
          <section className="rounded-lg border border-white/8 bg-white/3 p-4">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">Source image</h2>
            {sourcePreview ? (
              <img src={sourcePreview} alt="source" className="w-full rounded object-contain" />
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded border border-dashed border-white/15 bg-white/3 p-6 transition-colors hover:border-white/30 hover:bg-white/5">
                <span className="text-[12px] text-white/55">Pick an image…</span>
                <input type="file" accept="image/*" onChange={onPickFile} className="hidden" />
              </label>
            )}
          </section>

          {/* Simple mode — one-click render with locked-good defaults */}
          {!advanced && (
            <section className="rounded-lg border border-white/8 bg-white/3 p-4">
              <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-white/40">Details</h2>
              <p className="mb-3 text-[10px] text-white/30">
                Pick how detailed the mosaic should be. Renders immediately.
              </p>
              <div className="space-y-1.5">
                {DETAIL_PRESETS.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => applyDetail(d)}
                    disabled={(!sourceFile && !sourcePath) || rendering}
                    className="block w-full rounded border border-white/8 bg-white/3 px-3 py-2.5 text-left transition-colors hover:border-purple-500/40 hover:bg-purple-500/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/3"
                  >
                    <div className="text-[13px] font-medium text-white/85">{d.label}</div>
                    <div className="text-[10px] text-white/40">{d.sub}</div>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setAdvanced(true)}
                className="mt-3 text-[11px] text-white/40 underline decoration-white/15 underline-offset-2 hover:text-white/70"
              >
                Show advanced settings
              </button>
            </section>
          )}

          {advanced && (
            <button
              type="button"
              onClick={() => setAdvanced(false)}
              className="block text-[11px] text-white/40 underline decoration-white/15 underline-offset-2 hover:text-white/70"
            >
              ← Back to simple
            </button>
          )}

          {advanced && (<>
          {/* Print preset */}
          <section className="rounded-lg border border-white/8 bg-white/3 p-4">
            <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-white/40">Print preset</h2>
            <p className="mb-3 text-[10px] text-white/30">
              One-tap settings tuned for ~320 DPI at a frame size. Sets grid + tile + reuse.
            </p>
            <div className="space-y-1.5">
              {PRINT_PRESETS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPrint(p)}
                  className={`block w-full rounded px-3 py-2 text-left transition-colors ${
                    printPreset === p.id
                      ? 'border border-purple-500/40 bg-purple-500/15 text-purple-200'
                      : 'border border-white/8 bg-white/3 text-white/60 hover:border-white/20'
                  }`}
                >
                  <div className="text-[12px] font-medium">{p.label}</div>
                  <div className="text-[10px] text-white/35">{p.sub}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Grid */}
          <section className="rounded-lg border border-white/8 bg-white/3 p-4">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">Grid</h2>
            <div className="space-y-1.5">
              {GRID_PRESETS.map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => { setGrid(p); setPrintPreset(null) }}
                  className={`block w-full rounded px-3 py-2 text-left text-[12px] transition-colors ${
                    grid.w === p.w && grid.h === p.h
                      ? 'border border-purple-500/40 bg-purple-500/15 text-purple-200'
                      : 'border border-white/8 bg-white/3 text-white/60 hover:border-white/20'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <label className="mt-3 block text-[11px] text-white/40">
              Tile size (px)
              <input
                type="number"
                min={16}
                max={128}
                value={tileSize}
                onChange={e => { setTileSize(Number(e.target.value)); setPrintPreset(null) }}
                className="mt-1 w-full rounded border border-white/10 bg-stone-900 px-2 py-1 text-[12px] text-white"
              />
            </label>
          </section>

          <section className="rounded-lg border border-white/8 bg-white/3 p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">People filter</h2>
              {people.length > 0 && (
                <span className="text-[10px] text-white/35">{people.length} selected</span>
              )}
            </div>
            <p className="mb-2 text-[10px] text-white/30">
              Restrict tile pool to photos containing any of these people. Leave empty for all.
            </p>
            <div className="relative">
              <input
                type="text"
                value={peopleSearch}
                onChange={e => setPeopleSearch(e.target.value)}
                placeholder="Search…"
                className="w-full rounded border border-white/10 bg-stone-900 px-2 py-1.5 text-[12px] text-white placeholder:text-white/25"
              />
              {peopleResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded border border-white/10 bg-stone-950 shadow-lg">
                  {peopleResults.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addPerson(p)}
                      className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[12px] text-white/75 hover:bg-white/5"
                    >
                      {p.avatar && (
                        <img src={p.avatar} alt="" className="h-6 w-6 rounded-full object-cover" />
                      )}
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {people.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {people.map(p => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/15 py-0.5 pl-2 pr-1 text-[11px] text-purple-100"
                  >
                    {p.name}
                    <button
                      type="button"
                      onClick={() => removePerson(p.id)}
                      className="ml-0.5 rounded-full p-0.5 text-purple-200/60 hover:bg-white/10 hover:text-white"
                      aria-label="Remove"
                    >×</button>
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-white/8 bg-white/3 p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Exclude people</h2>
              {excludePeople.length > 0 && (
                <span className="text-[10px] text-white/35">{excludePeople.length} blocked</span>
              )}
            </div>
            <p className="mb-2 text-[10px] text-white/30">
              Drop any tile where one of these people appears. Pairs with the include filter — "Cayce & Stephen but not if Henry's in frame".
            </p>
            <div className="relative">
              <input
                type="text"
                value={excludeSearch}
                onChange={e => setExcludeSearch(e.target.value)}
                placeholder="Search…"
                className="w-full rounded border border-white/10 bg-stone-900 px-2 py-1.5 text-[12px] text-white placeholder:text-white/25"
              />
              {excludeResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded border border-white/10 bg-stone-950 shadow-lg">
                  {excludeResults.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addExcludePerson(p)}
                      className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[12px] text-white/75 hover:bg-white/5"
                    >
                      {p.avatar && <img src={p.avatar} alt="" className="h-6 w-6 rounded-full object-cover" />}
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {excludePeople.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {excludePeople.map(p => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/15 py-0.5 pl-2 pr-1 text-[11px] text-rose-100"
                  >
                    {p.name}
                    <button
                      type="button"
                      onClick={() => removeExcludePerson(p.id)}
                      className="ml-0.5 rounded-full p-0.5 text-rose-200/60 hover:bg-white/10 hover:text-white"
                      aria-label="Remove"
                    >×</button>
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-white/8 bg-white/3 p-4">
            <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-white/40">Tile crop</h2>
            <p className="mb-2 text-[10px] text-white/30">
              Saliency = crop the densest quadrant per tile (better than center, doesn't chop faces).
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'center',   label: 'Center'   },
                { id: 'saliency', label: 'Saliency' },
              ].map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCrop(c.id)}
                  className={`rounded px-3 py-2 text-[12px] transition-colors ${
                    crop === c.id
                      ? 'border border-purple-500/40 bg-purple-500/15 text-purple-200'
                      : 'border border-white/8 bg-white/3 text-white/60 hover:border-white/20'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-white/8 bg-white/3 p-4">
            <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-white/40">Source smoothing</h2>
            <p className="mb-2 text-[10px] text-white/30">
              Average each cell over an N×N source patch instead of one pixel.
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {[1, 3, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSourceSmooth(n)}
                  className={`rounded px-3 py-2 text-[12px] transition-colors ${
                    sourceSmooth === n
                      ? 'border border-purple-500/40 bg-purple-500/15 text-purple-200'
                      : 'border border-white/8 bg-white/3 text-white/60 hover:border-white/20'
                  }`}
                >
                  {n === 1 ? 'Off' : `${n}×${n}`}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-white/8 bg-white/3 p-4">
            <div className="mb-1 flex items-baseline justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Edge-aware</h2>
              <button
                type="button"
                onClick={() => setEdgeAware(v => !v)}
                className={`rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider transition-colors ${
                  edgeAware
                    ? 'border border-purple-500/40 bg-purple-500/15 text-purple-200'
                    : 'border border-white/8 bg-white/5 text-white/45 hover:bg-white/10'
                }`}
              >
                {edgeAware ? 'on' : 'off'}
              </button>
            </div>
            <p className="text-[10px] text-white/30">
              Source edges get busy tiles, flat regions get smooth tiles. Sharper faces + detail.
            </p>
          </section>

          <section className="rounded-lg border border-white/8 bg-white/3 p-4">
            <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-white/40">Color matching</h2>
            <p className="mb-2 text-[10px] text-white/30">
              LAB = perceptual (better). RGB = naive Euclidean, kept for A/B.
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {['lab', 'rgb'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColorDistance(c)}
                  className={`rounded px-3 py-2 text-[12px] uppercase tracking-wider transition-colors ${
                    colorDistance === c
                      ? 'border border-purple-500/40 bg-purple-500/15 text-purple-200'
                      : 'border border-white/8 bg-white/3 text-white/60 hover:border-white/20'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-white/8 bg-white/3 p-4">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">Tile shape</h2>
            <div className="grid grid-cols-3 gap-1.5">
              {['square', 'hex', 'dot'].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setShape(s)}
                  className={`rounded px-3 py-2 text-[12px] capitalize transition-colors ${
                    shape === s
                      ? 'border border-purple-500/40 bg-purple-500/15 text-purple-200'
                      : 'border border-white/8 bg-white/3 text-white/60 hover:border-white/20'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-white/8 bg-white/3 p-4">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">Tile reuse</h2>
            <label className="block text-[11px] text-white/40">
              Max reuse of one tile
              <input
                type="number"
                min={1}
                max={200}
                value={maxReuse}
                onChange={e => { setMaxReuse(Number(e.target.value)); setPrintPreset(null) }}
                className="mt-1 w-full rounded border border-white/10 bg-stone-900 px-2 py-1 text-[12px] text-white"
              />
            </label>
          </section>

          <div className="rounded border border-white/8 bg-white/3 p-3 text-[11px] text-white/55">
            <div className="mb-1.5 text-[10px] uppercase tracking-wider text-white/35">Expected output (max)</div>
            <div className="tabular-nums">
              up to {grid.w} × {grid.h} tiles · {(grid.w * tileSize).toLocaleString()} × {(grid.h * tileSize).toLocaleString()} px
            </div>
            <div className="mt-0.5 tabular-nums text-white/35">
              {((grid.w * grid.h * tileSize * tileSize) / 1_000_000).toFixed(1)} MP ·
              {' '}{(grid.w * grid.h).toLocaleString()} cells ·
              {' '}≥ {Math.ceil((grid.w * grid.h) / maxReuse).toLocaleString()} unique photos
            </div>
            <div className="mt-1 text-[10px] text-white/30">
              One side may shrink to match source aspect — no stretching.
            </div>
          </div>

          <button
            type="button"
            onClick={() => onRender()}
            disabled={(!sourceFile && !sourcePath) || rendering}
            className="w-full rounded bg-purple-500/30 px-3 py-2 text-[13px] font-semibold text-purple-100 transition-colors hover:bg-purple-500/45 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-white/30"
          >
            {rendering ? 'Rendering…' : 'Render mosaic'}
          </button>
          </>)}
        </div>

        <section className="rounded-lg border border-white/8 bg-stone-950 p-4">
          {error && <p className="text-[13px] text-red-400">Failed: {error}</p>}
          {!error && !renderUrl && !rendering && (
            <div className="flex h-full min-h-[300px] items-center justify-center text-[12px] text-white/30">
              Output will appear here.
            </div>
          )}
          {rendering && (
            <div className="flex h-full min-h-[300px] items-center justify-center text-[12px] text-white/45">
              Building mosaic — this can take a minute…
            </div>
          )}
          {renderUrl && (
            <div className="space-y-3">
              <img src={renderUrl} alt="mosaic" className="w-full rounded" />
              {meta && (
                <div className="space-y-0.5 text-[11px] text-white/40">
                  <div>
                    {meta.grid_w}×{meta.grid_h} · tile {meta.tile_size}px ·
                    {' '}{meta.unique_tiles?.toLocaleString?.()} unique tiles ·
                    {' '}pool {meta.pool_size?.toLocaleString?.()} ·
                    {' '}{(meta.render_ms / 1000).toFixed(1)}s
                  </div>
                  {meta.out_w && (
                    <div>
                      {meta.out_w.toLocaleString()} × {meta.out_h.toLocaleString()} px ·
                      {' '}{((meta.out_w * meta.out_h) / 1_000_000).toFixed(1)} MP ·
                      {' '}{(meta.file_size_bytes / 1_000_000).toFixed(1)} MB
                    </div>
                  )}
                  {meta.solid_fallbacks > 0 && (
                    <div className="text-amber-400/70">
                      {meta.solid_fallbacks.toLocaleString()} cells filled with solid hex
                      ({((meta.solid_fallbacks / meta.cells) * 100).toFixed(1)}%) — no unused tile
                      available at that color.
                    </div>
                  )}
                </div>
              )}
              <a
                href={renderUrl}
                download="mosaic.jpg"
                className="inline-flex rounded border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] text-white/70 hover:bg-white/10"
              >
                Download
              </a>
            </div>
          )}
        </section>
      </div>
    </Container>
  )
}

import { useCallback, useState } from 'react'

/**
 * Rebuilding one photograph out of thousands of others.
 *
 * The settings that produce a good mosaic were found by A/B and are not
 * obvious — LAB distance, 3×3 source smoothing, centre crop, square tiles —
 * so the simple presets set all of them and only leave density to choose.
 * Everything else is behind "more settings" for the times it is worth
 * arguing with.
 */

export const DENSITY = [
  { id: 'coarse', label: 'Coarse', grid: { w: 60, h: 80 }, tile: 64, sub: '60 × 80 · each photo still readable' },
  { id: 'fine', label: 'Fine', grid: { w: 80, h: 120 }, tile: 64, sub: '80 × 120 · the balance' },
  { id: 'veryfine', label: 'Very fine', grid: { w: 120, h: 160 }, tile: 48, sub: '120 × 160 · sharpest likeness' },
]

// Sized for roughly 320 DPI at the frame, with the grid in the frame's aspect
// so a print shop has nothing to crop or letterbox.
export const PRINTS = [
  { id: 'p_11x14', label: '11 × 14 framed', grid: { w: 50, h: 60 }, tile: 72, reuse: 6, sub: '3.6K × 4.3K · 13 MP' },
  { id: 'p_16x20', label: '16 × 20 print', grid: { w: 60, h: 80 }, tile: 80, reuse: 6, sub: '4.8K × 6.4K · 31 MP' },
  { id: 'p_18x24', label: '18 × 24 poster', grid: { w: 80, h: 100 }, tile: 72, reuse: 5, sub: '5.8K × 7.2K · 41 MP' },
  { id: 'p_24x36', label: '24 × 36 poster', grid: { w: 80, h: 120 }, tile: 96, reuse: 4, sub: '7.7K × 11.5K · 88 MP' },
]

export const GRIDS = [
  { label: 'Small · 60 × 80', w: 60, h: 80 },
  { label: 'Medium · 80 × 120', w: 80, h: 120 },
  { label: 'Large · 120 × 160', w: 120, h: 160 },
  { label: 'Extra large · 160 × 220', w: 160, h: 220 },
]

const LOCKED = {
  shape: 'square', colorDistance: 'lab', edgeAware: false,
  sourceSmooth: 3, crop: 'center', maxReuse: 10,
}

const DEFAULTS = {
  grid: GRIDS[1], tileSize: 48, maxReuse: 8, shape: 'square',
  colorDistance: 'lab', edgeAware: false, sourceSmooth: 1, crop: 'center',
}

export function useMosaic(initialPath) {
  const [settings, setSettings] = useState(DEFAULTS)
  const [printPreset, setPrintPreset] = useState(null)
  const [source, setSource] = useState(
    initialPath ? { path: initialPath, file: null } : null,
  )
  const [include, setInclude] = useState([])
  const [exclude, setExclude] = useState([])
  const [result, setResult] = useState(null)   // { url, meta }
  const [rendering, setRendering] = useState(false)
  const [error, setError] = useState(null)

  // Any hand-made change breaks the print preset's promise about DPI, so the
  // highlight goes with it rather than claiming a size the render will miss.
  const set = useCallback((patch) => {
    setSettings(s => ({ ...s, ...patch }))
    setPrintPreset(null)
  }, [])

  const render = useCallback(async (override) => {
    const s = { ...settings, ...override }
    if (!source) return
    setRendering(true)
    setError(null)
    setResult(null)
    try {
      const body = new FormData()
      if (source.file) body.append('source', source.file)
      else body.append('source_path', source.path)
      body.append('grid_w', s.grid.w)
      body.append('grid_h', s.grid.h)
      body.append('tile_size', s.tileSize)
      body.append('color', 'mean')
      body.append('max_reuse', s.maxReuse)
      body.append('shape', s.shape)
      body.append('color_distance', s.colorDistance)
      body.append('edge_aware', s.edgeAware ? 'true' : 'false')
      body.append('source_smooth', s.sourceSmooth)
      body.append('crop', s.crop)
      if (include.length) body.append('person_ids', include.map(p => p.id).join(','))
      if (exclude.length) body.append('exclude_person_ids', exclude.map(p => p.id).join(','))

      const res = await fetch('/api/admin/mosaic/render', { method: 'POST', body })
      if (!res.ok) throw new Error(`The render came back ${res.status}`)
      const header = res.headers.get('x-mosaic-meta')
      setResult({
        url: URL.createObjectURL(await res.blob()),
        meta: header ? JSON.parse(header) : null,
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setRendering(false)
    }
  }, [settings, source, include, exclude])

  /** A density preset: set everything the A/B settled, then go. */
  const renderAt = useCallback((preset) => {
    const next = { ...DEFAULTS, ...LOCKED, grid: preset.grid, tileSize: preset.tile }
    setSettings(next)
    setPrintPreset(null)
    render(next)
  }, [render])

  const applyPrint = useCallback((preset) => {
    setSettings(s => ({ ...s, grid: preset.grid, tileSize: preset.tile, maxReuse: preset.reuse }))
    setPrintPreset(preset.id)
  }, [])

  const pickFile = useCallback((file) => {
    setSource({ file, path: null, preview: URL.createObjectURL(file) })
    setResult(null)
  }, [])

  return {
    settings, set, printPreset, applyPrint,
    source, pickFile,
    include, setInclude, exclude, setExclude,
    result, rendering, error, render, renderAt,
    estimate: estimate(settings),
  }
}

/** What the render would come out as, before spending a minute finding out. */
function estimate({ grid, tileSize, maxReuse }) {
  const cells = grid.w * grid.h
  return {
    cells,
    width: grid.w * tileSize,
    height: grid.h * tileSize,
    megapixels: (cells * tileSize * tileSize) / 1e6,
    uniquePhotos: Math.ceil(cells / maxReuse),
  }
}

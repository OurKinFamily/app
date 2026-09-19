import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useMosaic, DENSITY, PRINTS, GRIDS } from '../../../src/lib/useMosaic'

const META = JSON.stringify({ grid_w: 80, grid_h: 120, unique_tiles: 900 })

beforeEach(() => {
  global.URL.createObjectURL = vi.fn(() => 'blob:mosaic')
  global.fetch = vi.fn(() => Promise.resolve({
    ok: true,
    headers: { get: () => META },
    blob: () => Promise.resolve(new Blob(['x'])),
  }))
})

const sent = () => Object.fromEntries(global.fetch.mock.calls[0][1].body.entries())
const withSource = () => {
  const view = renderHook(() => useMosaic('archive/2026/x.jpg'))
  return view
}

describe('useMosaic', () => {
  describe('what it would produce', () => {
    it('works out the size before spending a minute finding out', () => {
      const { result } = withSource()
      const { grid, tileSize } = result.current.settings
      expect(result.current.estimate).toMatchObject({
        cells: grid.w * grid.h,
        width: grid.w * tileSize,
        height: grid.h * tileSize,
      })
    })

    it('says how many different photographs it will take at least', () => {
      const { result } = withSource()
      const { cells, uniquePhotos } = result.current.estimate
      expect(uniquePhotos).toBe(Math.ceil(cells / result.current.settings.maxReuse))
    })
  })

  describe('the source', () => {
    it('starts from a photograph already in the archive', () => {
      const { result } = withSource()
      expect(result.current.source).toMatchObject({ path: 'archive/2026/x.jpg' })
    })

    it('has none when the page was opened cold', () => {
      const { result } = renderHook(() => useMosaic(null))
      expect(result.current.source).toBeNull()
    })

    it('takes one chosen from the machine instead', async () => {
      const { result } = renderHook(() => useMosaic(null))
      const file = new File(['x'], 'nan.jpg', { type: 'image/jpeg' })
      await act(async () => { result.current.pickFile(file) })
      expect(result.current.source).toMatchObject({ file, preview: 'blob:mosaic' })
    })

    it('will not render without one', async () => {
      const { result } = renderHook(() => useMosaic(null))
      await act(async () => { await result.current.render() })
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('rendering', () => {
    it('sends the settings the server needs', async () => {
      const { result } = withSource()
      await act(async () => { await result.current.render() })
      expect(sent()).toMatchObject({
        source_path: 'archive/2026/x.jpg',
        color: 'mean',
        edge_aware: 'false',
      })
    })

    // Busy tiles where the source has edges, flat ones where it does not.
    it('sends edge-aware on when it is turned on', async () => {
      const { result } = withSource()
      await act(async () => { result.current.set({ edgeAware: true }) })
      await act(async () => { await result.current.render() })
      expect(sent().edge_aware).toBe('true')
    })

    it('sends the file itself when one was chosen', async () => {
      const { result } = renderHook(() => useMosaic(null))
      const file = new File(['x'], 'nan.jpg', { type: 'image/jpeg' })
      await act(async () => { result.current.pickFile(file) })
      await act(async () => { await result.current.render() })
      expect(sent().source).toBeInstanceOf(File)
    })

    it('keeps the meta the server reports alongside the picture', async () => {
      const { result } = withSource()
      await act(async () => { await result.current.render() })
      expect(result.current.result.url).toBe('blob:mosaic')
      expect(result.current.result.meta).toMatchObject({ unique_tiles: 900 })
    })

    it('copes with a render that reports no meta at all', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true, headers: { get: () => null }, blob: () => Promise.resolve(new Blob(['x'])),
      }))
      const { result } = withSource()
      await act(async () => { await result.current.render() })
      expect(result.current.result.meta).toBeNull()
    })

    it('says why when the render is refused', async () => {
      global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 413 }))
      const { result } = withSource()
      await act(async () => { await result.current.render() })
      expect(result.current.error).toContain('413')
      expect(result.current.rendering).toBe(false)
    })
  })

  describe('the people filters', () => {
    it('sends nobody when none were chosen', async () => {
      const { result } = withSource()
      await act(async () => { await result.current.render() })
      expect(sent().person_ids).toBeUndefined()
      expect(sent().exclude_person_ids).toBeUndefined()
    })

    // "Cayce and Stephen, but not with Henry in the frame."
    it('sends both lists when they are', async () => {
      const { result } = withSource()
      await act(async () => {
        result.current.setInclude([{ id: 'p1' }, { id: 'p2' }])
        result.current.setExclude([{ id: 'p3' }])
      })
      await act(async () => { await result.current.render() })
      expect(sent().person_ids).toBe('p1,p2')
      expect(sent().exclude_person_ids).toBe('p3')
    })
  })

  describe('the presets', () => {
    // The settings that make a mosaic good rather than muddy were found by
    // comparing renders, not by reasoning.
    it('locks the A/B settings in when a density is chosen', async () => {
      const { result } = withSource()
      await act(async () => { result.current.renderAt(DENSITY[0]) })
      expect(sent()).toMatchObject({
        color_distance: 'lab', source_smooth: '3', crop: 'center', shape: 'square',
      })
      expect(result.current.settings.grid).toEqual(DENSITY[0].grid)
    })

    it('sets grid, tile and reuse together for a print size', async () => {
      const { result } = withSource()
      await act(async () => { result.current.applyPrint(PRINTS[1]) })
      expect(result.current.settings).toMatchObject({
        grid: PRINTS[1].grid, tileSize: PRINTS[1].tile, maxReuse: PRINTS[1].reuse,
      })
      expect(result.current.printPreset).toBe(PRINTS[1].id)
    })

    // Any hand-made change breaks the preset's promise about DPI, so the
    // highlight goes rather than claiming a size the render will miss.
    it('drops the print highlight the moment anything is changed by hand', async () => {
      const { result } = withSource()
      await act(async () => { result.current.applyPrint(PRINTS[0]) })
      await act(async () => { result.current.set({ tileSize: 40 }) })
      expect(result.current.printPreset).toBeNull()
    })

    it('drops it for a density preset too', async () => {
      const { result } = withSource()
      await act(async () => { result.current.applyPrint(PRINTS[0]) })
      await act(async () => { result.current.renderAt(DENSITY[2]) })
      expect(result.current.printPreset).toBeNull()
    })
  })

  describe('the presets themselves', () => {
    it('offers grids from small to extra large', () => {
      const cells = GRIDS.map(g => g.w * g.h)
      expect([...cells].sort((a, b) => a - b)).toEqual(cells)
    })

    it('sizes every print for a real frame', () => {
      for (const print of PRINTS) {
        expect(print.label).toMatch(/\d+ × \d+/)
        expect(print.reuse).toBeGreaterThan(0)
      }
    })
  })
})

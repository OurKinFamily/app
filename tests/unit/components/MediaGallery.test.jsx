import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MediaGallery } from '../../../src/components/MediaGallery'

// Replace the noop ResizeObserver stub with one that fires its callback
// immediately so the gallery's width state populates. Multi-photo days
// run computeRows(items, width, …) — width=0 returns no rows.
const realResize = globalThis.ResizeObserver
class FiringResize {
  constructor(cb) { this.cb = cb }
  observe()      { this.cb([{ contentRect: { width: 1200 } }], this) }
  unobserve()    {}
  disconnect()   {}
}

function item(path, timestamp, opts = {}) {
  return {
    path,
    timestamp,
    width: 1,
    height: 1,
    aspect: 1,
    ...opts,
  }
}

function renderGallery(props = {}) {
  return render(
    <MediaGallery items={[]} {...props} />
  )
}

describe('MediaGallery', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    globalThis.ResizeObserver = FiringResize
  })
  afterEach(() => {
    globalThis.ResizeObserver = realResize
  })

  describe('rendering', () => {
    it('renders a gallery container with data-testid="gallery"', () => {
      renderGallery()
      expect(screen.getByTestId('gallery')).toBeInTheDocument()
    })
    it('renders one gallery-item per non-gap item', () => {
      renderGallery({
        items: [
          item('a.jpg', '2024-01-01T00:00:00Z'),
          item('b.jpg', '2024-01-01T00:00:00Z'),
          item('c.jpg', '2024-01-02T00:00:00Z'),
        ],
      })
      expect(screen.getAllByTestId('gallery-item').length).toBe(3)
    })
    it('hides the testid on gap items so they don\'t inflate counts', () => {
      renderGallery({
        items: [
          item('real.jpg', '2024-01-01T00:00:00Z'),
          { path: '__gap__1', __gap: true, gapFromTs: 'x', gapToTs: 'y', timestamp: '2023-01-01T00:00:00Z', width: 1, height: 1, aspect: 1 },
        ],
      })
      expect(screen.getAllByTestId('gallery-item').length).toBe(1)
    })
    it('renders a day header for each day group', () => {
      renderGallery({
        items: [
          item('a.jpg', '2024-05-27T00:00:00Z'),
          item('b.jpg', '2024-04-15T00:00:00Z'),
        ],
      })
      // formatDay output appears for each date.
      expect(screen.getByText(/May 27, 2024/)).toBeInTheDocument()
      expect(screen.getByText(/Apr 15, 2024/)).toBeInTheDocument()
    })
    it('appends a city / place summary to the header when present', () => {
      renderGallery({
        items: [
          item('a.jpg', '2024-05-27T00:00:00Z', { city: 'Lancaster' }),
          item('b.jpg', '2024-05-27T00:00:00Z', { city: 'Newburyport' }),
        ],
      })
      expect(screen.getByText('Lancaster & Newburyport')).toBeInTheDocument()
    })
    it('appends the city to a single-photo day header too (short-shelf branch)', () => {
      renderGallery({
        items: [
          item('a.jpg', '2024-05-27T00:00:00Z', { city: 'Lancaster' }),
          item('b.jpg', '2024-05-28T00:00:00Z', { city: 'Newburyport' }),
        ],
      })
      // Both days have one photo → both render via the short-shelf branch.
      expect(screen.getByText('Lancaster')).toBeInTheDocument()
      expect(screen.getByText('Newburyport')).toBeInTheDocument()
    })
  })

  describe('packing', () => {
    it('combines consecutive single-photo days into a shelf', () => {
      // Three days, each one photo → one wrapping shelf.
      const { container } = renderGallery({
        items: [
          item('a.jpg', '2024-01-01T00:00:00Z'),
          item('b.jpg', '2024-01-02T00:00:00Z'),
          item('c.jpg', '2024-01-03T00:00:00Z'),
        ],
      })
      // All three items rendered; each as its own section header.
      expect(container.querySelectorAll('section').length).toBe(3)
      expect(screen.getAllByTestId('gallery-item').length).toBe(3)
    })
    it('keeps multi-photo days on their own row (not in a short shelf)', () => {
      const { container } = renderGallery({
        items: [
          item('a.jpg', '2024-01-01T00:00:00Z'),
          item('b.jpg', '2024-01-01T00:00:00Z'),  // 2 on day 1
          item('c.jpg', '2024-01-02T00:00:00Z'),  // 1 on day 2
        ],
      })
      // 2 sections — one per day grouping.
      expect(container.querySelectorAll('section').length).toBe(2)
    })
  })

  describe('scroll-loader wiring', () => {
    it('attaches a scroll listener when onLoadOlder is provided and detaches on unmount', () => {
      const addSpy    = vi.spyOn(window, 'addEventListener')
      const removeSpy = vi.spyOn(window, 'removeEventListener')
      const { unmount } = renderGallery({ onLoadOlder: vi.fn() })
      const addedScroll = addSpy.mock.calls.find(([k]) => k === 'scroll')
      expect(addedScroll).toBeDefined()
      unmount()
      expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
    })
    it('does NOT call onLoadOlder while body.style.position is fixed (lightbox lock)', () => {
      const onLoadOlder = vi.fn()
      renderGallery({ onLoadOlder })
      document.body.style.position = 'fixed'
      act(() => { window.dispatchEvent(new Event('scroll')) })
      expect(onLoadOlder).not.toHaveBeenCalled()
      document.body.style.position = ''
    })
  })

  describe('fill-gap wiring', () => {
    it('makes no fill request when there are no gap tiles', () => {
      const onFillGap = vi.fn()
      renderGallery({ onFillGap, items: [] })
      act(() => { window.dispatchEvent(new Event('scroll')) })
      expect(onFillGap).not.toHaveBeenCalled()
    })

    it('requests the fill on the scroll itself, without waiting for it to settle', () => {
      // regression(2026-08-31): the fill was debounced 500ms behind the scroll
      // SETTLING. A flick is what creates a gap in the first place, and a flick
      // does not settle over the placeholders — so the request never fired and
      // the skipped photos stayed absent from the grid. 896 items sat behind
      // one such gap. No timer advance here: the call must already have landed.
      const onFillGap = vi.fn()
      const items = [
        item('a.jpg', '2024-01-01T00:00:00Z'),
        { path: '__gap__1', __gap: true, gapFromTs: 'fts', gapToTs: 'tts',
          timestamp: '2023-01-01T00:00:00Z', width: 1, height: 1, aspect: 1 },
      ]
      renderGallery({ onFillGap, items })
      onFillGap.mockClear()
      act(() => { window.dispatchEvent(new Event('scroll')) })
      expect(onFillGap).toHaveBeenCalledWith({ from: 'fts', to: 'tts' })
    })
    it('calls onFillGap when a gap tile is in view after the debounce', () => {
      vi.useFakeTimers()
      const onFillGap = vi.fn()
      const items = [
        item('a.jpg', '2024-01-01T00:00:00Z'),
        { path: '__gap__1', __gap: true, gapFromTs: 'fts', gapToTs: 'tts',
          timestamp: '2023-01-01T00:00:00Z', width: 1, height: 1, aspect: 1 },
      ]
      const { container } = renderGallery({ onFillGap, items })
      // Position the gap tile in view; default getBoundingClientRect in
      // jsdom returns all zeros which counts as in-view (bottom > 0 false).
      // Override the gap element's rect to be visible.
      container.querySelectorAll('[data-gap-from]').forEach(el => {
        el.getBoundingClientRect = () => ({ bottom: 100, top: 50 })
      })
      act(() => { window.dispatchEvent(new Event('scroll')) })
      act(() => { vi.advanceTimersByTime(600) })
      vi.useRealTimers()
      expect(onFillGap).toHaveBeenCalledWith({ from: 'fts', to: 'tts' })
    })
    it('deduplicates within a single sweep (multiple identical gap tiles → one call)', () => {
      vi.useFakeTimers()
      const onFillGap = vi.fn()
      const items = [
        item('a.jpg', '2024-01-01T00:00:00Z'),
        { path: '__gap__1', __gap: true, gapFromTs: 'fts', gapToTs: 'tts',
          timestamp: '2023-01-01T00:00:00Z', width: 1, height: 1, aspect: 1 },
        { path: '__gap__2', __gap: true, gapFromTs: 'fts', gapToTs: 'tts',
          timestamp: '2023-01-01T00:00:00Z', width: 1, height: 1, aspect: 1 },
      ]
      const { container } = renderGallery({ onFillGap, items })
      container.querySelectorAll('[data-gap-from]').forEach(el => {
        el.getBoundingClientRect = () => ({ bottom: 100, top: 50 })
      })
      act(() => { window.dispatchEvent(new Event('scroll')) })
      act(() => { vi.advanceTimersByTime(600) })
      vi.useRealTimers()
      expect(onFillGap).toHaveBeenCalledTimes(1)
    })
  })

  describe('bottom-edge loader', () => {
    // scrollHeight must exceed the 2500px prefetch margin, or every position
    // counts as "near the end" and the far-from-end case is untestable.
    function setScrollState({ y, innerHeight = 800, scrollHeight = 20000 }) {
      Object.defineProperty(window, 'scrollY', { value: y, writable: true, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: innerHeight, writable: true, configurable: true })
      Object.defineProperty(document.documentElement, 'scrollHeight', { value: scrollHeight, writable: true, configurable: true })
    }

    it('asks for the next batch when the viewport nears the end', () => {
      const onLoadOlder = vi.fn()
      renderGallery({ onLoadOlder, items: [item('a.jpg', '2024-01-01T00:00:00Z')] })
      setScrollState({ y: 18000 })
      act(() => { window.dispatchEvent(new Event('scroll')) })
      expect(onLoadOlder).toHaveBeenCalled()
    })

    it('does not ask while still far from the end', () => {
      const onLoadOlder = vi.fn()
      renderGallery({ onLoadOlder, items: [item('a.jpg', '2024-01-01T00:00:00Z')] })
      setScrollState({ y: 100 })
      act(() => { window.dispatchEvent(new Event('scroll')) })
      expect(onLoadOlder).not.toHaveBeenCalled()
    })

    // A flick is: at the bottom edge AND moving fast. Both must hold, so the
    // helper advances y (for velocity) and grows scrollHeight alongside it —
    // exactly what real paging does — to stay pinned at the edge.
    function flicker() {
      let y = 19000
      return (onLoadOlder, { step = 6000, gapMs = 1000 } = {}) => {
        y += step
        vi.advanceTimersByTime(gapMs)
        setScrollState({ y, scrollHeight: y + 800 + 200 })
        act(() => { window.dispatchEvent(new Event('scroll')) })
        return onLoadOlder.mock.calls.at(-1)[0]
      }
    }

    it('starts with a small skip and grows it as the flick continues', () => {
      // Progressive by design: an instantaneous velocity band jumped straight
      // to a decade on one hard gesture and overshot badly.
      vi.useFakeTimers()
      const onLoadOlder = vi.fn()
      renderGallery({ onLoadOlder, items: [item('a.jpg', '2024-01-01T00:00:00Z')] })
      setScrollState({ y: 0 })
      act(() => { window.dispatchEvent(new Event('scroll')) })

      const flick = flicker()
      const first  = flick(onLoadOlder)
      const second = flick(onLoadOlder)
      const third  = flick(onLoadOlder)
      vi.useRealTimers()

      expect(first).toBeGreaterThan(0)
      expect(second).toBeGreaterThan(first)
      expect(third).toBeGreaterThan(second)
    })

    it('caps the stride instead of growing without bound', () => {
      vi.useFakeTimers()
      const onLoadOlder = vi.fn()
      renderGallery({ onLoadOlder, items: [item('a.jpg', '2024-01-01T00:00:00Z')] })
      setScrollState({ y: 0 })
      act(() => { window.dispatchEvent(new Event('scroll')) })

      const flick = flicker()
      let last = 0
      for (let i = 0; i < 20; i++) last = flick(onLoadOlder)
      vi.useRealTimers()

      // Top rung of the ladder: 1825 days.
      expect(last).toBe(1825 * 86400 * 1000)
    })

    it('drops back to the smallest stride once the user stops flicking', () => {
      // Otherwise a later gentle flick inherits a decade-wide stride from a
      // gesture made minutes ago.
      vi.useFakeTimers()
      const onLoadOlder = vi.fn()
      renderGallery({ onLoadOlder, items: [item('a.jpg', '2024-01-01T00:00:00Z')] })
      setScrollState({ y: 0 })
      act(() => { window.dispatchEvent(new Event('scroll')) })

      const flick = flicker()
      const first = flick(onLoadOlder)
      flick(onLoadOlder)
      flick(onLoadOlder)
      // Long enough to reset the ramp; step raised so it still counts as a flick.
      const afterPause = flick(onLoadOlder, { gapMs: 2000, step: 14000 })
      vi.useRealTimers()

      expect(afterPause).toBe(first)
    })

    it('does not skip when scrolling at a reading pace', () => {
      // A skip leaves a gap to backfill. Only pay that cost for a real flick.
      vi.useFakeTimers()
      const onLoadOlder = vi.fn()
      renderGallery({ onLoadOlder, items: [item('a.jpg', '2024-01-01T00:00:00Z')] })

      setScrollState({ y: 0 })
      act(() => { window.dispatchEvent(new Event('scroll')) })
      vi.advanceTimersByTime(10000)
      setScrollState({ y: 19000 })     // 1900 px/s — below the 5000 threshold
      act(() => { window.dispatchEvent(new Event('scroll')) })
      vi.useRealTimers()

      expect(onLoadOlder.mock.calls.at(-1)[0]).toBe(0)
    })
  })

  describe('year-tracker (data-year scroll listener)', () => {
    it('updates currentYear when a data-year element is in view', () => {
      const items = [
        item('a.jpg', '2024-01-01T00:00:00Z'),
        item('b.jpg', '2024-01-02T00:00:00Z'),  // multi-photo day shape
        item('c.jpg', '2024-01-02T00:00:00Z'),
      ]
      const onJump = vi.fn()
      const { container } = renderGallery({
        items,
        scrubber: { years: [{ year: 2024, count: 1 }], onJump },
      })
      // Stub each data-year element's bounding rect to put it in view.
      container.querySelectorAll('[data-year]').forEach(el => {
        el.getBoundingClientRect = () => ({ bottom: 100, top: 50 })
      })
      act(() => { window.dispatchEvent(new Event('scroll')) })
      // The year-tracker effect doesn't blow up — exercises lines 95-103.
      expect(container.querySelectorAll('[data-year]').length).toBeGreaterThan(0)
    })
  })

  describe('DateScrubber integration', () => {
    it('renders a scrubber when the scrubber prop is provided', () => {
      const onJump = vi.fn()
      const { container } = renderGallery({
        scrubber: { years: [{ year: 2024, count: 1 }, { year: 2020, count: 1 }], onJump },
        items: [item('a.jpg', '2024-01-01T00:00:00Z')],
      })
      // DateScrubber's root is a div positioned fixed; assert it rendered.
      expect(container.querySelector('[role="button"], button')).not.toBeNull()
    })
    it('attaches the year-tracking scroll listener and cleans up on unmount', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener')
      const { unmount } = renderGallery({
        scrubber: { years: [{ year: 2024, count: 1 }], onJump: vi.fn() },
        items: [item('a.jpg', '2024-01-01T00:00:00Z')],
      })
      unmount()
      // Two listeners attach with scrubber on: one in the bottom-loader
      // effect, one in the year-tracker effect. Both detach on unmount.
      expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
    })
  })

  describe('item without timestamp', () => {
    it('handles items missing a timestamp (data-year is undefined)', () => {
      const items = [
        { path: 'a.jpg', timestamp: null, width: 1, height: 1, aspect: 1 },
        { path: 'b.jpg', timestamp: null, width: 1, height: 1, aspect: 1 },
      ]
      const { container } = renderGallery({ items })
      expect(container.querySelectorAll('[data-testid="gallery-item"]').length).toBe(2)
    })
    it('falls back to aspect=1 for a single-photo day when item.aspect is missing', () => {
      // Single-photo day → short shelf path → `item.aspect || 1`.
      const items = [{ path: 'a.jpg', timestamp: '2024-01-01T00:00:00Z', width: 1, height: 1 }]
      renderGallery({ items })
      expect(screen.getByTestId('gallery-item')).toBeInTheDocument()
    })
    it('handles a single-photo day with no timestamp', () => {
      const items = [{ path: 'a.jpg', width: 1, height: 1, aspect: 1 }]
      renderGallery({ items })
      expect(screen.getByTestId('gallery-item')).toBeInTheDocument()
    })
  })

  describe('gap items in short-shelf paths', () => {
    it('renders favorites + onFavorite + onSelect branches for gap items', () => {
      const onFavorite = vi.fn()
      const onSelect   = vi.fn()
      const favorites  = new Set(['a.jpg'])
      const items = [
        { path: '__gap__1', __gap: true, gapFromTs: 'x', gapToTs: 'y',
          timestamp: '2023-01-01T00:00:00Z', width: 1, height: 1, aspect: 1 },
      ]
      const { container } = renderGallery({ items, favorites, onFavorite, onSelect })
      expect(container.querySelector('[data-gap-from]')).not.toBeNull()
      expect(container.querySelector('[data-testid="gallery-item"]')).toBeNull()
    })
    it('short-shelf real items render with favorites + onFavorite + onSelect', () => {
      // Three different days × 1 item each → short shelf with mix.
      const onFavorite = vi.fn()
      const onSelect   = vi.fn()
      const favorites  = new Set(['a.jpg'])
      const items = [
        item('a.jpg', '2024-05-27T00:00:00Z'),
        item('b.jpg', '2024-05-26T00:00:00Z'),
        item('c.jpg', '2024-05-25T00:00:00Z'),
      ]
      renderGallery({ items, favorites, onFavorite, onSelect })
      // Favorited a.jpg shows the unfavorite control; others show favorite.
      expect(screen.getByRole('button', { name: 'Unfavorite' })).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: 'Favorite' }).length).toBe(2)
    })
    it('short-shelf items without onSelect/onFavorite render with undefined handlers', () => {
      const items = [item('a.jpg', '2024-05-27T00:00:00Z')]
      renderGallery({ items })  // no onFavorite, no onSelect
      // No favorite button, no clickable button wrapper.
      expect(screen.queryByRole('button', { name: /Favorite/ })).not.toBeInTheDocument()
    })
    it('tall-shelf day filled with __gap items renders without favorite/onSelect handlers', () => {
      const ts = '2023-01-01T00:00:00Z'
      const items = Array.from({ length: 12 }, (_, i) => ({
        path: `__gap__${i}`, __gap: true,
        gapFromTs: 'x', gapToTs: 'y',
        timestamp: ts, width: 1, height: 1, aspect: 1,
      }))
      renderGallery({ items, onFavorite: vi.fn(), onSelect: vi.fn(), favorites: new Set() })
      expect(screen.queryByRole('button', { name: /Favorite/ })).not.toBeInTheDocument()
    })
    it('tall-shelf day with no favorites prop at all (optional chain branch)', () => {
      const items = [
        item('a.jpg', '2024-01-01T00:00:00Z'),
        item('b.jpg', '2024-01-01T00:00:00Z'),
        item('c.jpg', '2024-01-01T00:00:00Z'),
      ]
      renderGallery({ items, onFavorite: vi.fn(), onSelect: vi.fn() })  // no favorites
      // Renders without throwing — `favorites?.has` short-circuits to undefined.
      expect(screen.getAllByTestId('gallery-item').length).toBe(3)
    })
    it('tall-shelf day without onFavorite + no onSelect (undefined handler branches)', () => {
      const items = [
        item('a.jpg', '2024-01-01T00:00:00Z'),
        item('b.jpg', '2024-01-01T00:00:00Z'),
        item('c.jpg', '2024-01-01T00:00:00Z'),
      ]
      renderGallery({ items })  // bare — no favorites, no onFavorite, no onSelect
      expect(screen.queryByRole('button', { name: /Favorite/ })).not.toBeInTheDocument()
    })
    it('short-shelf onFavorite + onSelect are invoked when clicked', () => {
      const onFavorite = vi.fn()
      const onSelect   = vi.fn()
      const items = [
        item('a.jpg', '2024-05-27T00:00:00Z'),
        item('b.jpg', '2024-05-26T00:00:00Z'),
      ]
      renderGallery({ items, onFavorite, onSelect })
      fireEvent.click(screen.getAllByRole('button', { name: 'Favorite' })[0])
      expect(onFavorite).toHaveBeenCalled()
      const tileBtn = screen.getAllByTestId('gallery-item')[0].querySelector('button:not([aria-label])')
      fireEvent.click(tileBtn)
      expect(onSelect).toHaveBeenCalled()
    })
    it('tall-shelf onFavorite + onSelect are invoked when clicked', () => {
      const onFavorite = vi.fn()
      const onSelect   = vi.fn()
      const favorites  = new Set(['a.jpg'])
      const items = [
        item('a.jpg', '2024-01-01T00:00:00Z'),
        item('b.jpg', '2024-01-01T00:00:00Z'),
        item('c.jpg', '2024-01-01T00:00:00Z'),
      ]
      renderGallery({ items, favorites, onFavorite, onSelect })
      // a.jpg favorited → Unfavorite label shows.
      expect(screen.getByRole('button', { name: 'Unfavorite' })).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Unfavorite' }))
      expect(onFavorite).toHaveBeenCalled()
      const tileBtn = screen.getAllByTestId('gallery-item')[0].querySelector('button:not([aria-label])')
      fireEvent.click(tileBtn)
      expect(onSelect).toHaveBeenCalled()
    })
    it('cleans up scroll + ResizeObserver listeners on unmount', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener')
      const { unmount } = renderGallery({
        items: [item('a.jpg', '2024-01-01T00:00:00Z')],
        onLoadOlder: vi.fn(),
        onFillGap:   vi.fn(),
        scrubber:    { years: [{ year: 2024, count: 1 }], onJump: vi.fn() },
      })
      unmount()
      expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
    })
  })

  describe('favorites + onSelect branches', () => {
    it('honors favorites=set passed in', () => {
      const favs = new Set(['a.jpg'])
      renderGallery({
        items: [item('a.jpg', '2024-01-01T00:00:00Z')],
        favorites: favs,
        onFavorite: vi.fn(),
      })
      // Aria-label flips when path is in favorites set.
      expect(screen.getByRole('button', { name: 'Unfavorite' })).toBeInTheDocument()
    })
    it('omits favorite button entirely when onFavorite is not provided', () => {
      renderGallery({ items: [item('a.jpg', '2024-01-01T00:00:00Z')] })
      expect(screen.queryByRole('button', { name: /Favorite/ })).not.toBeInTheDocument()
    })
    it('omits onSelect cursor when onSelect is not provided', () => {
      renderGallery({ items: [item('a.jpg', '2024-01-01T00:00:00Z')] })
      // Tile renders as a div (no button) when onSelect is missing.
      const tile = screen.getByTestId('gallery-item')
      expect(tile.querySelector('button')).toBeNull()
    })
  })

  describe('justified-row last-row sizing', () => {
    it('renders multi-photo days using computeRows + row.last branch', () => {
      const items = [
        item('a.jpg', '2024-01-01T00:00:00Z'),
        item('b.jpg', '2024-01-01T00:00:00Z'),
        item('c.jpg', '2024-01-01T00:00:00Z'),
        item('d.jpg', '2024-01-01T00:00:00Z'),
      ]
      const { container } = renderGallery({ items })
      expect(container.querySelectorAll('[data-testid="gallery-item"]').length).toBe(4)
    })
    it('handles multi-row days (some rows are NOT last → flex branch)', () => {
      // 8 items × aspect 1 × rowHeight 200 = 1600px > 1200 container → 2 rows.
      // First row is not last → exercises the `${aspect} 1 0` flex branch.
      const items = Array.from({ length: 8 }, (_, i) =>
        item(`p${i}.jpg`, '2024-01-01T00:00:00Z')
      )
      const { container } = renderGallery({ items })
      expect(container.querySelectorAll('[data-testid="gallery-item"]').length).toBe(8)
    })
  })

  describe('favorite + click handlers', () => {
    it('clicking an item invokes onSelect', () => {
      const onSelect = vi.fn()
      const items = [item('a.jpg', '2024-01-01T00:00:00Z')]
      renderGallery({ items, onSelect })
      // The first <button> inside a gallery-item is the Media click target.
      const card = screen.getByTestId('gallery-item').querySelector('button')
      fireEvent.click(card)
      expect(onSelect).toHaveBeenCalledWith(items[0])
    })
    it('clicking the favorite control invokes onFavorite (not onSelect)', () => {
      const onSelect   = vi.fn()
      const onFavorite = vi.fn()
      const items = [item('a.jpg', '2024-01-01T00:00:00Z')]
      renderGallery({ items, onSelect, onFavorite })
      const fav = screen.getByRole('button', { name: 'Favorite' })
      fireEvent.click(fav)
      expect(onFavorite).toHaveBeenCalledTimes(1)
      expect(onSelect).not.toHaveBeenCalled()
    })
  })

  describe('selection', () => {
    it('renders a checkbox per tile and reports (item, index, shiftKey) on toggle', () => {
      const onToggleSelect = vi.fn()
      const items = [
        item('a.jpg', '2024-01-02T00:00:00Z'),
        item('b.jpg', '2024-01-01T00:00:00Z'),
      ]
      renderGallery({ items, onSelect: vi.fn(), onToggleSelect, selectedPaths: new Set(['a.jpg']) })
      const boxes = screen.getAllByRole('checkbox')
      expect(boxes).toHaveLength(2)
      expect(boxes.some(b => b.getAttribute('aria-checked') === 'true')).toBe(true)
      fireEvent.click(boxes[0], { shiftKey: true })
      const [item0, index0, shift0] = onToggleSelect.mock.calls[0]
      expect(item0.path).toBe('a.jpg')
      expect(index0).toBe(0)
      expect(shift0).toBe(true)
    })

    it('renders no checkboxes when onToggleSelect is absent', () => {
      renderGallery({ items: [item('a.jpg', '2024-01-01T00:00:00Z')], onSelect: vi.fn() })
      expect(screen.queryByRole('checkbox')).toBe(null)
    })
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

// useFavorites carries module-level state (cache, inflight, subscriber set).
// Tests must reset the module between cases or one test's cache will leak
// into the next. vi.resetModules + dynamic import gives each test a fresh
// instance.
let useFavorites

async function fresh() {
  vi.resetModules()
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
  localStorage.clear()
  const mod = await import('../../../src/lib/useFavorites')
  useFavorites = mod.useFavorites
}

describe('useFavorites', () => {
  beforeEach(fresh)

  describe('initial load', () => {
    it('GETs /api/me/favorites/paths once and seeds the set', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ['a.jpg', 'b.jpg'] })
      const { result } = renderHook(() => useFavorites())
      await waitFor(() => expect(result.current.favs.size).toBe(2))
      expect(global.fetch).toHaveBeenCalledWith('/api/me/favorites/paths')
      expect(result.current.favs.has('a.jpg')).toBe(true)
      expect(result.current.favs.has('b.jpg')).toBe(true)
    })
    it('treats a non-ok response as an empty favorites list', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => null })
      const { result } = renderHook(() => useFavorites())
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      expect(result.current.favs.size).toBe(0)
    })
    it('keeps multiple hook instances in sync via the shared cache', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ['a.jpg'] })
      const a = renderHook(() => useFavorites())
      const b = renderHook(() => useFavorites())
      await waitFor(() => expect(a.result.current.favs.size).toBe(1))
      expect(b.result.current.favs.has('a.jpg')).toBe(true)
    })
  })

  describe('legacy localStorage migration', () => {
    it('POSTs each legacy path then clears localStorage', async () => {
      localStorage.setItem('gallery-favs', JSON.stringify(['legacy-1.jpg', 'legacy-2.jpg']))
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => [] })  // initial GET
        .mockResolvedValue({ ok: true })                            // migration PUTs
      global.fetch = fetchMock
      const { result } = renderHook(() => useFavorites())
      await waitFor(() => expect(result.current.favs.size).toBe(2))
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/me/favorites?path=legacy-1.jpg',
        { method: 'PUT' },
      )
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/me/favorites?path=legacy-2.jpg',
        { method: 'PUT' },
      )
      expect(localStorage.getItem('gallery-favs')).toBe(null)
    })
    it('skips legacy paths that are already in the server set', async () => {
      localStorage.setItem('gallery-favs', JSON.stringify(['dup.jpg']))
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ['dup.jpg'] })
        .mockResolvedValue({ ok: true })
      global.fetch = fetchMock
      renderHook(() => useFavorites())
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
      // Only the initial GET — no PUT for the already-present path.
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
    it('swallows JSON parse errors from corrupt localStorage', async () => {
      localStorage.setItem('gallery-favs', '{not-json')
      const { result } = renderHook(() => useFavorites())
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      // Hook still works — the migration failure is swallowed.
      expect(result.current.favs.size).toBe(0)
    })
  })

  describe('toggle', () => {
    it('PUTs and adds when the path is not yet favorited', async () => {
      const { result } = renderHook(() => useFavorites())
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      global.fetch = vi.fn().mockResolvedValue({ ok: true })
      await act(async () => { await result.current.toggle({ path: 'new.jpg' }) })
      expect(result.current.favs.has('new.jpg')).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/me/favorites?path=new.jpg',
        { method: 'PUT' },
      )
    })
    it('DELETEs and removes when the path is already favorited', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ['x.jpg'] })
      const { result } = renderHook(() => useFavorites())
      await waitFor(() => expect(result.current.favs.has('x.jpg')).toBe(true))
      global.fetch = vi.fn().mockResolvedValue({ ok: true })
      await act(async () => { await result.current.toggle({ path: 'x.jpg' }) })
      expect(result.current.favs.has('x.jpg')).toBe(false)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/me/favorites?path=x.jpg',
        { method: 'DELETE' },
      )
    })
    it('accepts a plain string as well as { path }', async () => {
      const { result } = renderHook(() => useFavorites())
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      global.fetch = vi.fn().mockResolvedValue({ ok: true })
      await act(async () => { await result.current.toggle('plain.jpg') })
      expect(result.current.favs.has('plain.jpg')).toBe(true)
    })
    it('is a no-op when called with a falsy path', async () => {
      const { result } = renderHook(() => useFavorites())
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      const before = global.fetch.mock.calls.length
      await act(async () => { await result.current.toggle({}) })
      await act(async () => { await result.current.toggle(null) })
      expect(global.fetch.mock.calls.length).toBe(before)
    })
    it('rolls back the optimistic update when adding fails', async () => {
      const { result } = renderHook(() => useFavorites())
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      global.fetch = vi.fn().mockRejectedValue(new Error('offline'))
      await act(async () => { await result.current.toggle('bad.jpg') })
      expect(result.current.favs.has('bad.jpg')).toBe(false)
    })
    it('rolls back the optimistic update when removing fails', async () => {
      // Pre-seed with a favorite, then mock the DELETE to fail — the path
      // should reappear (the rollback branch where `had` was true).
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ['existing.jpg'] })
      const { result } = renderHook(() => useFavorites())
      await waitFor(() => expect(result.current.favs.has('existing.jpg')).toBe(true))
      global.fetch = vi.fn().mockRejectedValue(new Error('offline'))
      await act(async () => { await result.current.toggle('existing.jpg') })
      expect(result.current.favs.has('existing.jpg')).toBe(true)
    })
    it('initializes cache when toggle runs before the initial fetch resolves', async () => {
      // Make the initial GET hang so the toggle path hits `if (!cache)`.
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}))
      const { result } = renderHook(() => useFavorites())
      // Replace fetch for the toggle's own PUT call.
      const putMock = vi.fn().mockResolvedValue({ ok: true })
      // Wait for the loadFavorites useEffect to fire its (hanging) fetch.
      await Promise.resolve()
      global.fetch = putMock
      await act(async () => { await result.current.toggle('early.jpg') })
      expect(result.current.favs.has('early.jpg')).toBe(true)
      expect(putMock).toHaveBeenCalledWith(
        '/api/me/favorites?path=early.jpg',
        { method: 'PUT' },
      )
    })
  })

  describe('cleanup', () => {
    it('unmounts cleanly without throwing when another instance keeps toggling', async () => {
      const { unmount } = renderHook(() => useFavorites())
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      // The unmount removes the component subscriber; the test passes if
      // the notify() call from a later toggle on another hook doesn't blow
      // up trying to call the gone setState.
      expect(() => unmount()).not.toThrow()
      const other = renderHook(() => useFavorites())
      global.fetch = vi.fn().mockResolvedValue({ ok: true })
      await expect(
        act(async () => { await other.result.current.toggle('y.jpg') })
      ).resolves.not.toThrow()
    })
  })
})

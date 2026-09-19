import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useBulkActions } from '../../../src/lib/useBulkActions'

const PATHS = ['archive/2026/a.jpg', 'archive/2026/b jpg.jpg']

beforeEach(() => {
  global.fetch = vi.fn(() => Promise.resolve({
    ok: true,
    headers: { get: () => null },
    blob: () => Promise.resolve(new Blob(['z'])),
  }))
  global.URL.createObjectURL = vi.fn(() => 'blob:zip')
  global.URL.revokeObjectURL = vi.fn()
})

function setup(paths = PATHS) {
  const onDone = vi.fn()
  return { onDone, ...renderHook(() => useBulkActions({ paths, onDone })) }
}

const callsWith = method => global.fetch.mock.calls.filter(([, i]) => i?.method === method)

describe('useBulkActions', () => {
  describe('favouriting a selection', () => {
    it('touches every photograph chosen', async () => {
      const s = setup()
      await act(async () => { await s.result.current.favourite() })
      expect(callsWith('PUT')).toHaveLength(2)
    })

    it('escapes a path with a space in it', async () => {
      const s = setup()
      await act(async () => { await s.result.current.favourite() })
      expect(String(callsWith('PUT')[1][0])).toContain('b%20jpg.jpg')
    })

    it('un-favourites the same way', async () => {
      const s = setup()
      await act(async () => { await s.result.current.unfavourite() })
      expect(callsWith('DELETE')).toHaveLength(2)
    })
  })

  describe('re-dating a selection', () => {
    it('sends the same correction to each', async () => {
      const s = setup()
      await act(async () => { await s.result.current.redate({ timestamp: '1974-08-03' }) })
      const patches = callsWith('PATCH')
      expect(patches).toHaveLength(2)
      expect(JSON.parse(patches[0][1].body)).toEqual({ timestamp: '1974-08-03' })
    })
  })

  describe('deleting a selection', () => {
    it('removes every one', async () => {
      const s = setup()
      await act(async () => { await s.result.current.remove() })
      expect(callsWith('DELETE')).toHaveLength(2)
    })
  })

  describe('while something is running', () => {
    // So a bar can say "Deleting…" rather than going quiet and hoping.
    it('says which act it is', async () => {
      // One photograph, so one request to hold open — the act only finishes
      // when every one of them has answered.
      let release
      global.fetch = vi.fn(() => new Promise(r => { release = r }))
      const s = setup([PATHS[0]])
      let pending
      await act(async () => { pending = s.result.current.remove() })
      expect(s.result.current.busy).toBe('delete')
      await act(async () => { release({ ok: true }); await pending })
      expect(s.result.current.busy).toBeNull()
    })
  })

  describe('when some of them fail', () => {
    // A partial success still changed things, and leaving the page showing
    // the old state is worse than saying nothing.
    it('reloads anyway, and says how many did not work', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true })
        .mockRejectedValueOnce(new Error('locked'))
      const s = setup()
      await act(async () => { await s.result.current.favourite() })
      expect(s.onDone).toHaveBeenCalledWith({ name: 'favourite', failed: 1, total: 2 })
    })

    it('reports none failed when they all worked', async () => {
      const s = setup()
      await act(async () => { await s.result.current.favourite() })
      expect(s.onDone).toHaveBeenCalledWith({ name: 'favourite', failed: 0, total: 2 })
    })

    it('copes when nobody is listening for the finish', async () => {
      const { result } = renderHook(() => useBulkActions({ paths: PATHS }))
      await act(async () => { await result.current.favourite() })
      expect(result.current.busy).toBeNull()
    })
  })

  describe('with nothing selected', () => {
    it.each(['favourite', 'unfavourite', 'remove', 'download'])('does nothing for %s', async (action) => {
      const s = setup([])
      await act(async () => { await s.result.current[action]() })
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('downloading a selection', () => {
    it('asks for them all in one archive', async () => {
      const s = setup()
      await act(async () => { await s.result.current.download() })
      const [url, init] = global.fetch.mock.calls[0]
      expect(url).toBe('/api/gallery/download')
      expect(JSON.parse(init.body)).toEqual({ paths: PATHS })
    })

    // Spying on the anchor's own click rather than on createElement, which
    // React also uses — replacing it breaks rendering entirely.
    const savedAs = async (contentDisposition) => {
      let name
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(function saved() { name = this.download })
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        headers: { get: () => contentDisposition },
        blob: () => Promise.resolve(new Blob(['z'])),
      }))
      const s = setup()
      await act(async () => { await s.result.current.download() })
      click.mockRestore()
      return name
    }

    it('uses the name the server chose', async () => {
      expect(await savedAs('attachment; filename="ourkin-12-photos.zip"'))
        .toBe('ourkin-12-photos.zip')
    })

    it('reads a name the server had to escape', async () => {
      expect(await savedAs("attachment; filename*=UTF-8''ourkin%20photos.zip"))
        .toBe('ourkin photos.zip')
    })

    it('falls back to a sensible name when the server offers none', async () => {
      expect(await savedAs(null)).toBe('photos.zip')
    })

    // A few hundred photographs is not something to keep in memory a moment
    // longer than necessary.
    it('lets the archive go as soon as the browser has it', async () => {
      const s = setup()
      await act(async () => { await s.result.current.download() })
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:zip')
    })

    it('stops saying "downloading" when the server refuses', async () => {
      global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 413 }))
      const s = setup()
      await act(async () => {
        await expect(s.result.current.download()).rejects.toThrow('413')
      })
      expect(s.result.current.busy).toBeNull()
    })
  })
})

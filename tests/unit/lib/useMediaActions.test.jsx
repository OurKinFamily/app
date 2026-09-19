import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useMediaActions } from '../../../src/lib/useMediaActions'

const ITEM = { path: 'archive/2026/a b.jpg', url: '/api/media/a.jpg', filename: 'a b.jpg' }
const EDITED = { version: 1758300000, width: 800, height: 600 }

const ok = body => Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
const refused = (status = 500, body) => Promise.resolve({
  ok: false, status, json: () => (body ? Promise.resolve(body) : Promise.reject(new Error('no body'))),
})

function setup(over = {}) {
  const handlers = {
    openPath: 'archive/2026/a b.jpg',
    close: vi.fn(),
    onVersion: vi.fn(),
    onRemoved: vi.fn(),
    ...over,
  }
  return { ...handlers, ...renderHook(() => useMediaActions(handlers)) }
}

const lastCall = () => global.fetch.mock.lastCall
const bodyOf = () => JSON.parse(lastCall()[1].body)

beforeEach(() => { global.fetch = vi.fn(() => ok(EDITED)) })

describe('useMediaActions', () => {
  describe('correcting the facts', () => {
    it('sends a new date, escaping the path', async () => {
      const s = setup()
      await act(async () => { await s.result.current.redate(ITEM, { timestamp: '1974-08-03' }) })
      expect(String(lastCall()[0])).toContain('a%20b.jpg')
      expect(bodyOf()).toEqual({ timestamp: '1974-08-03' })
    })

    it('sends a new place', async () => {
      const s = setup()
      await act(async () => { await s.result.current.relocate(ITEM, { latitude: 1, longitude: 2 }) })
      expect(String(lastCall()[0])).toContain('/location')
      expect(bodyOf()).toEqual({ latitude: 1, longitude: 2 })
    })

    it('sends a description', async () => {
      const s = setup()
      await act(async () => { await s.result.current.describe(ITEM, 'Dorothy at the lake') })
      expect(bodyOf()).toEqual({ description: 'Dorothy at the lake' })
    })

    it('says so when a description will not save', async () => {
      global.fetch = vi.fn(() => refused(409))
      const s = setup()
      await act(async () => {
        await expect(s.result.current.describe(ITEM, 'x')).rejects.toThrow('409')
      })
    })
  })

  describe('naming a face', () => {
    it('attaches the person to this photograph', async () => {
      const s = setup()
      await act(async () => { await s.result.current.assignFace({ face_index: 2 }, { id: 'p1' }) })
      expect(bodyOf()).toEqual({
        person_id: 'p1',
        faces: [{ photo_path: 'archive/2026/a b.jpg', face_index: 2 }],
      })
    })

    // FastAPI answers /people with a 307 to /people/, and the redirect names
    // the API host — a different origin through the dev proxy, so the browser
    // drops it and naming a new person silently did nothing.
    it('adds a new person at the URL that does not redirect', async () => {
      const s = setup()
      await act(async () => { await s.result.current.createPerson({ face_index: 0 }, 'Dorothy') })
      const created = global.fetch.mock.calls[0]
      expect(created[0]).toBe('/api/people/')
      expect(JSON.parse(created[1].body)).toEqual({ name: 'Dorothy' })
    })

    it('gives the face to the person it just added', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce(ok({ id: 'new1' }))
        .mockResolvedValueOnce(ok({}))
      const s = setup()
      await act(async () => { await s.result.current.createPerson({ face_index: 0 }, 'Dorothy') })
      expect(bodyOf().person_id).toBe('new1')
    })

    it('does not try to assign when the person could not be added', async () => {
      global.fetch = vi.fn(() => refused(400))
      const s = setup()
      await act(async () => { await s.result.current.createPerson({ face_index: 0 }, 'Dorothy') })
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('does not assign when the answer carries no person', async () => {
      global.fetch = vi.fn(() => ok({}))
      const s = setup()
      await act(async () => { await s.result.current.createPerson({ face_index: 0 }, 'Dorothy') })
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('takes a name back off', async () => {
      const s = setup()
      await act(async () => { await s.result.current.unassignFace({ id: 'p1', face_index: 3 }) })
      expect(String(lastCall()[0])).toContain('person_id=p1')
      expect(lastCall()[1].method).toBe('DELETE')
    })

    it('says so when a name cannot be taken off', async () => {
      global.fetch = vi.fn(() => refused(404))
      const s = setup()
      await act(async () => {
        await expect(s.result.current.unassignFace({ id: 'p1', face_index: 3 })).rejects.toThrow('404')
      })
    })

    it('sets a face aside as nobody', async () => {
      const s = setup()
      await act(async () => { await s.result.current.dismissFace({ face_index: 1 }) })
      expect(bodyOf()).toEqual({
        faces: [{ photo_path: 'archive/2026/a b.jpg', face_index: 1 }],
      })
    })
  })

  describe('changing the picture itself', () => {
    // The file keeps its URL, so without a new token the browser goes on
    // showing the copy it already has. Closing the lightbox only hid the stale
    // image; reopening served the same bytes.
    it.each([
      ['rotate', s => s.rotate(ITEM)],
      ['crop', s => s.crop(ITEM, { x: 0, y: 0, w: 100, h: 100 })],
      ['tone', s => s.tone(ITEM, { shadows: 0.1, midtones: 0, highlights: -0.1 })],
      ['restoreApply', s => s.restoreApply(ITEM)],
    ])('gives the page a new token after %s', async (_, run) => {
      const s = setup()
      await act(async () => { await run(s.result.current) })
      expect(s.onVersion).toHaveBeenCalledWith('archive/2026/a b.jpg', {
        version: 1758300000, width: 800, height: 600, aspect: 800 / 600,
      })
    })

    // Rotating swaps the dimensions, and the grid packs rows by aspect.
    it('carries the new shape, not just the token', async () => {
      global.fetch = vi.fn(() => ok({ version: 2, width: 600, height: 800 }))
      const s = setup()
      await act(async () => { await s.result.current.rotate(ITEM) })
      expect(s.onVersion.mock.lastCall[1].aspect).toBe(600 / 800)
    })

    it('turns it a quarter at a time', async () => {
      const s = setup()
      await act(async () => { await s.result.current.rotate(ITEM) })
      expect(String(global.fetch.mock.calls[0][0])).toContain('degrees=90')
    })

    it('sends the rectangle and any straightening together', async () => {
      const s = setup()
      await act(async () => {
        await s.result.current.crop(ITEM, { x: 10, y: 20, w: 300, h: 400, angle: 2.5 })
      })
      const url = String(global.fetch.mock.calls[0][0])
      expect(url).toContain('w=300')
      expect(url).toContain('angle=2.5')
    })

    it('sends no angle as zero rather than nothing', async () => {
      const s = setup()
      await act(async () => { await s.result.current.crop(ITEM, { x: 0, y: 0, w: 1, h: 1 }) })
      expect(String(global.fetch.mock.calls[0][0])).toContain('angle=0')
    })

    it.each([
      ['rotate', s => s.rotate(ITEM)],
      ['crop', s => s.crop(ITEM, { x: 0, y: 0, w: 1, h: 1 })],
    ])('leaves the picture alone when %s is refused', async (_, run) => {
      global.fetch = vi.fn(() => refused(422))
      const s = setup()
      await act(async () => { await run(s.result.current) })
      expect(s.onVersion).not.toHaveBeenCalled()
    })

    it.each([
      ['tone', s => s.tone(ITEM, { shadows: 0, midtones: 0, highlights: 0 })],
      ['restoreApply', s => s.restoreApply(ITEM)],
    ])('says so when %s is refused', async (_, run) => {
      global.fetch = vi.fn(() => refused(500))
      const s = setup()
      await act(async () => {
        await expect(run(s.result.current)).rejects.toThrow('500')
      })
    })
  })

  describe('restoring', () => {
    it('hands back the preview without writing anything', async () => {
      global.fetch = vi.fn(() => ok({ preview: '__restore/a.png' }))
      const s = setup()
      let preview
      await act(async () => { preview = await s.result.current.restorePreview(ITEM) })
      expect(preview).toEqual({ preview: '__restore/a.png' })
      expect(s.onVersion).not.toHaveBeenCalled()
    })

    // "Out of memory" and "no such file" call for completely different things
    // from the reader, and a spinner that simply stops tells them neither.
    it('passes the server’s own reason along', async () => {
      global.fetch = vi.fn(() => refused(500, { detail: 'CUDA out of memory' }))
      const s = setup()
      await act(async () => {
        await expect(s.result.current.restorePreview(ITEM)).rejects.toThrow('CUDA out of memory')
      })
    })

    it('says something when the refusal has no reason in it', async () => {
      global.fetch = vi.fn(() => refused(502))
      const s = setup()
      await act(async () => {
        await expect(s.result.current.restorePreview(ITEM)).rejects.toThrow('502')
      })
    })

    it('throws the preview away on request', async () => {
      const s = setup()
      await act(async () => { await s.result.current.restoreDiscard(ITEM) })
      expect(lastCall()[1].method).toBe('DELETE')
      expect(String(lastCall()[0])).toContain('/restore')
    })
  })

  describe('deleting one', () => {
    // A deleted photograph that sits in the grid until a reload invites a
    // second delete on something already gone.
    it('tells the page and closes the viewer', async () => {
      const s = setup()
      await act(async () => { await s.result.current.remove(ITEM) })
      expect(s.onRemoved).toHaveBeenCalledWith('archive/2026/a b.jpg')
      expect(s.close).toHaveBeenCalled()
    })

    it('leaves the tile in place when the delete is refused', async () => {
      global.fetch = vi.fn(() => refused(403))
      const s = setup()
      await act(async () => { await s.result.current.remove(ITEM) })
      expect(s.onRemoved).not.toHaveBeenCalled()
      expect(s.close).not.toHaveBeenCalled()
    })

    it('copes when no page is listening for removals', async () => {
      const s = setup({ onRemoved: undefined })
      await act(async () => { await s.result.current.remove(ITEM) })
      expect(s.close).toHaveBeenCalled()
    })
  })

  describe('downloading one', () => {
    it('saves it under the name it has in the archive', async () => {
      let saved
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(function named() { saved = this.download })
      const s = setup()
      await act(async () => { s.result.current.download(ITEM) })
      expect(saved).toBe('a b.jpg')
      click.mockRestore()
    })

    it('copes with a photograph that has no filename recorded', async () => {
      let saved
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(function named() { saved = this.download })
      const s = setup()
      await act(async () => { s.result.current.download({ url: '/api/media/x.jpg' }) })
      expect(saved).toBe('')
      click.mockRestore()
    })
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  describeApiFailure, installApiErrorReporter, onApiError,
} from '../../../src/lib/apiErrors'

/**
 * Most of this app calls `fetch` directly and returns quietly on a bad
 * response, so a save that did not happen looked exactly like one that did.
 * The reporter wraps `fetch` once and makes sure the failure is said out
 * loud, without changing what any call site does about it.
 */
describe('api errors', () => {
  describe('the sentence it produces', () => {
    it.each([
      ['GET', '/api/albums', 500, "Couldn't load albums — server error (500)."],
      ['GET', '/api/gallery/detail?path=x', 404, "Couldn't load that photograph — not found (404)."],
      ['POST', '/api/faces/reject', 500, "Couldn't save that face — server error (500)."],
      ['PATCH', '/api/people/p1', 400, "Couldn't save people — the server refused it (400)."],
      ['POST', '/api/people/', 409, "Couldn't save people — it conflicts with something already there (409)."],
    ])('%s %s %i', (method, path, status, expected) => {
      expect(describeApiFailure({ path, method, status })).toBe(expected)
    })

    it('says the server could not be reached when there was no response', () => {
      expect(describeApiFailure({ path: '/api/albums', method: 'GET', status: 0 }))
        .toBe("Couldn't reach the server — albums did not load.")
    })

    it('falls back to "that" for a corner of the API it has no name for', () => {
      expect(describeApiFailure({ path: '/api/widgets/3', method: 'GET', status: 500 }))
        .toBe("Couldn't load that — server error (500).")
    })

    it('copes with no detail at all', () => {
      expect(describeApiFailure({})).toBe("Couldn't reach the server — that did not load.")
    })
  })

  describe('reporting', () => {
    let win, uninstall, heard, unsubscribe, clock

    beforeEach(() => {
      clock = 0
      heard = []
      win = { fetch: vi.fn(() => Promise.resolve({ ok: true, status: 200 })) }
      uninstall = installApiErrorReporter(win, () => clock)
      unsubscribe = onApiError(m => heard.push(m))
    })

    afterEach(() => {
      unsubscribe()
      uninstall()
    })

    it('reports a failed /api request', async () => {
      win.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 500 }))
      // Re-wrap: the stub above replaced the wrapper installed in beforeEach.
      const w = { fetch: win.fetch }
      const off = installApiErrorReporter(w, () => clock)
      await w.fetch('/api/albums')
      expect(heard).toEqual(["Couldn't load albums — server error (500)."])
      off()
    })

    it('hands the response back untouched so call sites still decide', async () => {
      const w = { fetch: vi.fn(() => Promise.resolve({ ok: false, status: 404 })) }
      const off = installApiErrorReporter(w, () => clock)
      const res = await w.fetch('/api/albums')
      expect(res.status).toBe(404)
      off()
    })

    it('says nothing about a request that succeeded', async () => {
      await win.fetch('/api/albums')
      expect(heard).toEqual([])
    })

    it('leaves requests that are not to the API alone', async () => {
      const inner = vi.fn(() => Promise.resolve({ ok: false, status: 500 }))
      const w = { fetch: inner }
      const off = installApiErrorReporter(w, () => clock)
      await w.fetch('https://example.com/thing')
      expect(heard).toEqual([])
      off()
    })

    it('matches on the path of an absolute URL', async () => {
      const w = { fetch: vi.fn(() => Promise.resolve({ ok: false, status: 500 })) }
      const off = installApiErrorReporter(w, () => clock)
      await w.fetch('http://localhost:5173/api/albums')
      expect(heard).toHaveLength(1)
      off()
    })

    it('lets a request with no discernible url through', async () => {
      const inner = vi.fn(() => Promise.resolve({ ok: false, status: 500 }))
      const w = { fetch: inner }
      const off = installApiErrorReporter(w, () => clock)
      await w.fetch({ body: 'no url here' })
      expect(inner).toHaveBeenCalled()
      expect(heard).toEqual([])
      off()
    })

    it('lets a bare origin with no path through', async () => {
      const w = { fetch: vi.fn(() => Promise.resolve({ ok: false, status: 500 })) }
      const off = installApiErrorReporter(w, () => clock)
      await w.fetch('http://localhost:5173')
      expect(heard).toEqual([])
      off()
    })

    it('reads the method off a Request object', async () => {
      const w = { fetch: vi.fn(() => Promise.resolve({ ok: false, status: 500 })) }
      const off = installApiErrorReporter(w, () => clock)
      await w.fetch({ url: '/api/people/p1', method: 'DELETE' })
      expect(heard[0]).toContain("Couldn't save people")
      off()
    })

    it('stays quiet about the identity probe', async () => {
      // Not being an admin is the correct answer for most people, not news.
      const w = { fetch: vi.fn(() => Promise.resolve({ ok: false, status: 403 })) }
      const off = installApiErrorReporter(w, () => clock)
      await w.fetch('/api/admin/me')
      expect(heard).toEqual([])
      off()
    })

    it('says a network failure once and rethrows it', async () => {
      const w = { fetch: vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))) }
      const off = installApiErrorReporter(w, () => clock)
      await expect(w.fetch('/api/albums')).rejects.toThrow('Failed to fetch')
      expect(heard).toEqual(["Couldn't reach the server — albums did not load."])
      off()
    })

    it('stays quiet when a request was cancelled', async () => {
      // Navigating away aborts whatever was in flight. Saying so on every
      // page change would be constant noise.
      const abort = Object.assign(new Error('aborted'), { name: 'AbortError' })
      const w = { fetch: vi.fn(() => Promise.reject(abort)) }
      const off = installApiErrorReporter(w, () => clock)
      await expect(w.fetch('/api/albums')).rejects.toThrow('aborted')
      expect(heard).toEqual([])
      off()
    })

    it('says the same failure once while it keeps happening', async () => {
      const w = { fetch: vi.fn(() => Promise.resolve({ ok: false, status: 500 })) }
      const off = installApiErrorReporter(w, () => clock)
      await w.fetch('/api/albums')
      await w.fetch('/api/albums')
      await w.fetch('/api/albums')
      expect(heard).toHaveLength(1)

      // Still broken a while later is worth saying again.
      clock = 5000
      await w.fetch('/api/albums')
      expect(heard).toHaveLength(2)
      off()
    })

    it('still reports a different failure inside the quiet window', async () => {
      let status = 500
      const w = { fetch: vi.fn(() => Promise.resolve({ ok: false, status })) }
      const off = installApiErrorReporter(w, () => clock)
      await w.fetch('/api/albums')
      status = 404
      await w.fetch('/api/people/')
      expect(heard).toHaveLength(2)
      off()
    })

    it('carries the detail alongside the sentence', async () => {
      const seen = []
      const stop = onApiError((m, detail) => seen.push(detail))
      const w = { fetch: vi.fn(() => Promise.resolve({ ok: false, status: 500 })) }
      const off = installApiErrorReporter(w, () => clock)
      await w.fetch('/api/faces/reject', { method: 'POST' })
      expect(seen[0]).toEqual({ path: '/api/faces/reject', method: 'POST', status: 500 })
      stop(); off()
    })

    it('survives a listener that throws', async () => {
      const stop = onApiError(() => { throw new Error('bad listener') })
      const w = { fetch: vi.fn(() => Promise.resolve({ ok: false, status: 500 })) }
      const off = installApiErrorReporter(w, () => clock)
      await expect(w.fetch('/api/albums')).resolves.toBeTruthy()
      expect(heard).toHaveLength(1)
      stop(); off()
    })

    it('stops reporting once unsubscribed', async () => {
      unsubscribe()
      const w = { fetch: vi.fn(() => Promise.resolve({ ok: false, status: 500 })) }
      const off = installApiErrorReporter(w, () => clock)
      await w.fetch('/api/albums')
      expect(heard).toEqual([])
      off()
    })
  })

  describe('installing', () => {
    it('wraps only once, so a failure is not announced twice', () => {
      const original = vi.fn()
      const w = { fetch: original }
      const off = installApiErrorReporter(w)
      const wrapped = w.fetch
      const second = installApiErrorReporter(w)
      expect(w.fetch).toBe(wrapped)
      second()
      off()
      expect(w.fetch).toBe(original)
    })

    it('puts the original fetch back when uninstalled', async () => {
      const original = vi.fn(() => Promise.resolve({ ok: true }))
      const w = { fetch: original }
      installApiErrorReporter(w)()
      expect(w.fetch).toBe(original)
    })

    it('uses the real clock when none is supplied', async () => {
      // The app installs it with no clock at all; the tests inject one only
      // so they can drive the quiet window.
      const heard = []
      const stop = onApiError(m => heard.push(m))
      const w = { fetch: vi.fn(() => Promise.resolve({ ok: false, status: 500 })) }
      const off = installApiErrorReporter(w)
      await w.fetch('/api/albums')
      expect(heard).toEqual(["Couldn't load albums — server error (500)."])
      stop(); off()
    })

    it('does nothing where there is no fetch to wrap', () => {
      expect(installApiErrorReporter({})()).toBeUndefined()
      expect(installApiErrorReporter(null)()).toBeUndefined()
    })
  })
})

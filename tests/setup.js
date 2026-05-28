import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Tear down rendered components between tests so DOM state doesn't leak.
afterEach(() => {
  cleanup()
})

// --- jsdom polyfills -------------------------------------------------------
// jsdom doesn't ship these browser APIs. Stubbing here means individual
// tests don't have to. Tests that care about behavior can spy or replace
// per-case; the default stubs just keep `new IntersectionObserver(...)`
// and friends from throwing during render.

class StubObserver {
  observe()    {}
  unobserve()  {}
  disconnect() {}
  takeRecords() { return [] }
}

if (!globalThis.IntersectionObserver) globalThis.IntersectionObserver = StubObserver
if (!globalThis.ResizeObserver)       globalThis.ResizeObserver       = StubObserver
if (!globalThis.MutationObserver)     globalThis.MutationObserver     = StubObserver

// matchMedia — returns a stub MediaQueryList that never matches by default.
if (!globalThis.matchMedia) {
  globalThis.matchMedia = vi.fn().mockImplementation(query => ({
    matches: false,
    media:   query,
    onchange: null,
    addListener:    vi.fn(),  // legacy
    removeListener: vi.fn(),  // legacy
    addEventListener:    vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent:       vi.fn(),
  }))
}

// scrollTo / scrollY — jsdom warns about not-implemented. Overwrite (not
// just set when absent) so the "Not implemented" stderr noise goes away.
window.scrollTo = vi.fn()
Element.prototype.scrollTo = vi.fn()
Element.prototype.scrollIntoView = vi.fn()

// jsdom's HTMLMediaElement has no real playback engine; silence the
// "Not implemented" warnings for play/pause so audio/video components in
// the lightbox don't pollute test output.
if (typeof HTMLMediaElement !== 'undefined') {
  HTMLMediaElement.prototype.play  = vi.fn().mockResolvedValue()
  HTMLMediaElement.prototype.pause = vi.fn()
}

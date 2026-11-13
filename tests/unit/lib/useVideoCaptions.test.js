import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useVideoCaptions } from '../../../src/lib/useVideoCaptions'

const VTT = '/api/media/vtt/archive/2004/06/cayce-graduation.mp4?v=1'
const DETAIL = { heritage: { subtitle_url: VTT } }

const ok = body => Promise.resolve({ ok: true, json: () => Promise.resolve(body) })

beforeEach(() => { global.fetch = vi.fn(() => ok(DETAIL)) })

const render = props => renderHook(
  p => useVideoCaptions(p),
  { initialProps: { path: 'archive/2004/06/x.mp4', isVideo: true, detail: null, ...props } },
)

describe('useVideoCaptions', () => {
  describe('when nobody has supplied the detail record', () => {
    it('fetches it and offers the transcript', async () => {
      const { result } = render()
      await waitFor(() => expect(result.current).not.toBeNull())
      expect(result.current.src).toBe(VTT)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('offers nothing when the archive has no transcript for it', async () => {
      global.fetch = vi.fn(() => ok({ heritage: { subtitle_url: null } }))
      const { result } = render()
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      expect(result.current).toBeNull()
    })

    it('stays quiet when the request fails', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('offline')))
      const { result } = render()
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      expect(result.current).toBeNull()
    })

    it('stays quiet when the server answers with an error', async () => {
      global.fetch = vi.fn(() => Promise.resolve({ ok: false }))
      const { result } = render()
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      expect(result.current).toBeNull()
    })
  })

  describe('when the detail record is already to hand', () => {
    it('uses it without asking the server again', () => {
      const { result } = render({ detail: DETAIL })
      expect(result.current.src).toBe(VTT)
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  it('asks nothing for a photograph', () => {
    // A gallery is paged through an image at a time. Only video has a
    // transcript, so fetching per photograph would be request-per-keypress.
    const { result } = render({ isVideo: false })
    expect(global.fetch).not.toHaveBeenCalled()
    expect(result.current).toBeNull()
  })

  it('asks nothing when there is no path yet', () => {
    const { result } = render({ path: undefined })
    expect(global.fetch).not.toHaveBeenCalled()
    expect(result.current).toBeNull()
  })

  it('does not show one video’s captions on the next', async () => {
    // The fetch result is stored with the path it was fetched for. Keyed on
    // state alone, paging to the next video would briefly keep the previous
    // transcript attached to it.
    const view = render()
    await waitFor(() => expect(view.result.current).not.toBeNull())

    global.fetch = vi.fn(() => new Promise(() => {}))   // next one never resolves
    view.rerender({ path: 'archive/2006/08/other.mp4', isVideo: true, detail: null })
    expect(view.result.current).toBeNull()
  })
})

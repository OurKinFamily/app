import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SuggestionPhoto } from '../../../src/ui/faces/SuggestionPhoto'

// The editing controls are hidden wherever the archive cannot be written to.
// This test is about what naming a face does once pressed, so it says plainly
// that editing is allowed here.
vi.mock('../../../src/contexts/MeContext', () => ({
  useCanEditMedia: () => true,
  useMe: () => ({ isAdmin: true, canEditMedia: true, me: null, loading: false }),
  useIsAdmin: () => true,
}))

const PATH = 'archive/2023/11/2023-11-24_19-15-34_001.jpg'

const detail = {
  path: PATH,
  filename: '2023-11-24_19-15-34_001.jpg',
  people: [],
  unidentified: [{ face_index: 0, crop_url: '/api/media/__faces/crops/x_face0.jpg', bbox: [1, 2, 3, 4] }],
}

/**
 * Regression: naming somebody in the lightbox opened from the face-review
 * page accepted the answer and threw it away.
 *
 * `MediaDetail` is presentational — every edit is a prop — and the info panel
 * invokes them with `?.()`. The page handed it an item and a way to close and
 * nothing else, so the assigner opened, searched, took a click on a person,
 * closed itself, and sent no request at all. Nothing in the interface said so.
 *
 * The worst possible place for it: you open the whole photograph precisely
 * because the crop was too tight to tell who it was.
 */
describe('naming a face from the review page lightbox', () => {
  let calls
  let rect

  beforeEach(() => {
    calls = []
    global.fetch = vi.fn((url, opts = {}) => {
      calls.push({ url: String(url), ...opts })
      const u = String(url)
      if (u.startsWith('/api/gallery/detail')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(detail) })
      }
      if (u.startsWith('/api/people/search')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: 'p1', name: 'Cayce Ward Young', known_as: 'Cayce' }]),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })
    // jsdom lays nothing out, so every element measures zero.
    rect = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0,
    })
  })

  // Only this file's own spy. `vi.restoreAllMocks()` also strips the
  // implementation off the global `matchMedia` stub that tests/setup.js
  // installs once at load, and the next test in the file then dies inside
  // useIsWide on an undefined MediaQueryList.
  afterEach(() => rect.mockRestore())

  function open(props = {}) {
    return render(
      <MemoryRouter>
        <SuggestionPhoto path={PATH} onClose={() => {}} {...props} />
      </MemoryRouter>,
    )
  }

  it('sends the assignment to the API', async () => {
    const onFaceChange = vi.fn()
    open({ onFaceChange })

    fireEvent.click(await screen.findByLabelText('Name this face'))
    fireEvent.change(screen.getByLabelText('Search people'), { target: { value: 'cayce' } })
    // The assigner debounces its search by 250ms.
    fireEvent.click(await screen.findByText('Cayce Ward Young', {}, { timeout: 2000 }))

    const assign = await waitFor(() => {
      const c = calls.find(x => x.url === '/api/faces/search/assign')
      expect(c).toBeTruthy()
      return c
    })

    expect(assign.method).toBe('POST')
    expect(JSON.parse(assign.body)).toEqual({
      person_id: 'p1',
      // The face's own index, and the path of the photograph on screen —
      // getting either wrong tags the wrong face or the wrong picture.
      faces: [{ photo_path: PATH, face_index: 0 }],
    })

    // One fewer unnamed face, so the page's headline count is stale. The
    // suggestions themselves are left alone: re-scoring them is a
    // twenty-five second pass over the whole archive.
    await waitFor(() => expect(onFaceChange).toHaveBeenCalled())
  })

  it('works without anybody listening for the change', async () => {
    // The page passes a recount; the style guide does not.
    open()

    fireEvent.click(await screen.findByLabelText('Name this face'))
    fireEvent.change(screen.getByLabelText('Search people'), { target: { value: 'cayce' } })
    fireEvent.click(await screen.findByText('Cayce Ward Young', {}, { timeout: 2000 }))

    await waitFor(() =>
      expect(calls.some(c => c.url === '/api/faces/search/assign')).toBe(true))
  })
})

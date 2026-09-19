import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { ToastProvider } from '../../../src/components/Toast'
import { useUpload } from '../../../src/lib/useUpload'

/**
 * Regression: choosing a second batch of photographs blanked the thumbnails
 * of the first.
 *
 * The cleanup that releases preview URLs was written with `picked` as its
 * dependency, so it ran on every change to the list rather than on the way
 * out — revoking the URLs of files that were still on screen. The browser
 * then had nothing to draw them from.
 */
const wrapper = ({ children }) => <ToastProvider>{children}</ToastProvider>
const file = name => new File(['x'], name, { type: 'image/jpeg' })

beforeEach(() => {
  let n = 0
  global.URL.createObjectURL = vi.fn(() => `blob:${++n}`)
  global.URL.revokeObjectURL = vi.fn()
})

describe('choosing photographs in more than one go', () => {
  it('leaves the first batch’s previews alone', async () => {
    const { result } = renderHook(() => useUpload(), { wrapper })

    await act(async () => { result.current.add([file('a.jpg')]) })
    const firstBatch = result.current.picked.map(p => p.url)
    global.URL.revokeObjectURL.mockClear()

    await act(async () => { result.current.add([file('b.jpg')]) })

    const revoked = global.URL.revokeObjectURL.mock.calls.flat()
    for (const url of firstBatch) {
      expect(revoked, `${url} was released while still on screen`).not.toContain(url)
    }
    expect(result.current.picked).toHaveLength(2)
  })

  it('still releases everything when the page goes', async () => {
    const { result, unmount } = renderHook(() => useUpload(), { wrapper })
    await act(async () => { result.current.add([file('a.jpg'), file('b.jpg')]) })
    const urls = result.current.picked.map(p => p.url)

    global.URL.revokeObjectURL.mockClear()
    unmount()

    expect(global.URL.revokeObjectURL.mock.calls.flat().sort()).toEqual(urls.sort())
  })
})

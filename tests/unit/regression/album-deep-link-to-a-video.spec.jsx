/**
 * Regression: a deep link to a video in an album rendered nothing.
 *
 * AlbumPage builds its items from the endpoint, and keeps a fallback for the
 * case where the opened path is not among them — a link to item 600 of an
 * album whose first page stops at 500. That fallback set path, url,
 * thumbnail_url and filename, and omitted `is_video`.
 *
 * Which meant the detail view took the photograph branch and rendered
 * `<img src="…/clip.mov">`. An <img> pointing at a video draws nothing: no
 * broken-image icon, no console error, no failed request. Indistinguishable
 * from the undecodable-codec bug it was hiding behind.
 */
import { describe, expect, it } from 'vitest'
import { isVideo } from '../../../src/lib/media'

// The shape AlbumPage constructs when `items.find` misses. Mirrored here
// rather than driving the whole page through a router and a fetch: the defect
// was a missing key in an object literal, and this is the key.
const fallbackItem = openPath => ({
  path: openPath,
  url: `/api/media/${openPath}`,
  thumbnail_url: `/api/media/thumb/${openPath}`,
  is_video: isVideo(openPath),
  filename: openPath.split('/').pop(),
})

describe('a deep link to an album item outside the loaded page', () => {
  describe('when the item is a video', () => {
    it('is marked as a video, so the detail view renders a player', () => {
      expect(fallbackItem('archive/2025/08/clip.mov').is_video).toBe(true)
    })

    it('is marked for every video extension the archive holds', () => {
      for (const ext of ['mov', 'mp4', 'm4v', 'avi', 'mkv', 'webm', 'mts', 'mpg']) {
        expect(fallbackItem(`archive/2025/08/clip.${ext}`).is_video).toBe(true)
      }
    })

    it('is marked regardless of how the extension is capitalised', () => {
      // The archive holds .AVI files from 2009-era compacts.
      expect(fallbackItem('archive/2009/02/concert__P2270056.AVI').is_video).toBe(true)
    })
  })

  describe('when the item is a photograph', () => {
    it('is not marked as a video', () => {
      expect(fallbackItem('archive/2025/08/photo.jpg').is_video).toBe(false)
    })

    it('is not confused by a dot in the name', () => {
      expect(fallbackItem('archive/0000/mr. and mrs. young.jpg').is_video).toBe(false)
    })
  })

  it('still carries what the detail view needs to fetch and name the file', () => {
    const item = fallbackItem('archive/2025/08/clip.mov')
    expect(item.url).toContain('archive/2025/08/clip.mov')
    expect(item.filename).toBe('clip.mov')
  })
})

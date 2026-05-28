import { describe, it, expect } from 'vitest'
import { isVideo, mediaUrl, thumbUrl } from '../../../src/lib/media'

describe('isVideo', () => {
  it.each(['clip.mp4', 'movie.MOV', 'reel.AVI', 'capture.mkv', 'clip.webm', 'phone.m4v', 'gopro.mts'])(
    'returns true for %s',
    p => expect(isVideo(p)).toBe(true)
  )
  it.each(['scan.jpg', 'photo.jpeg', 'still.png', 'doc.pdf', 'anim.gif'])(
    'returns false for %s',
    p => expect(isVideo(p)).toBe(false)
  )
  it('handles null/undefined paths', () => {
    expect(isVideo(null)).toBe(false)
    expect(isVideo(undefined)).toBe(false)
  })
  it('handles paths with no extension', () => {
    expect(isVideo('weirdfile')).toBe(false)
  })
})

describe('mediaUrl', () => {
  it('prefixes with /api/media/', () => {
    expect(mediaUrl('archive/2020/01/foo.jpg')).toBe('/api/media/archive/2020/01/foo.jpg')
  })
})

describe('thumbUrl', () => {
  it('strips a leading archive/ before routing to /api/media/thumb/', () => {
    expect(thumbUrl('archive/2020/01/foo.jpg')).toBe('/api/media/thumb/2020/01/foo.jpg')
  })
  it('leaves non-archive paths untouched', () => {
    expect(thumbUrl('staging/random/foo.jpg')).toBe('/api/media/thumb/staging/random/foo.jpg')
  })
})

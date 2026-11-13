import { describe, it, expect } from 'vitest'
import { captionTrack } from '../../../src/lib/captions'

/**
 * The api has served WebVTT for the digitised home videos since June 2026 and
 * nothing rendered it, so a tape of someone talking played with no captions
 * available. These pin the one rule that decides whether a <track> appears:
 * the archive must actually say a transcript exists.
 */
describe('the caption track for a video', () => {
  it('is offered when the archive has a transcript', () => {
    const track = captionTrack({
      heritage: { subtitle_url: '/api/media/vtt/archive/2004/06/x.mp4?v=1' },
    })
    expect(track).toEqual({
      src: '/api/media/vtt/archive/2004/06/x.mp4?v=1',
      kind: 'captions',
      srcLang: 'en',
      label: 'Transcript',
    })
  })

  it('is withheld when there is no transcript, rather than guessed at', () => {
    // Guessing the url from the path would give every video a captions button
    // that leads to a 404 and an empty track.
    expect(captionTrack({ heritage: { subtitle_url: null } })).toBeNull()
    expect(captionTrack({ heritage: {} })).toBeNull()
    expect(captionTrack({})).toBeNull()
  })

  it('survives a detail record that never arrived', () => {
    expect(captionTrack(null)).toBeNull()
    expect(captionTrack(undefined)).toBeNull()
  })

  it('ignores a subtitle_url that is not a usable string', () => {
    expect(captionTrack({ heritage: { subtitle_url: '' } })).toBeNull()
    expect(captionTrack({ heritage: { subtitle_url: 42 } })).toBeNull()
  })
})

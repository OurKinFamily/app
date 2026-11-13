/**
 * Caption track for a video, when the archive has a transcript for it.
 *
 * Home videos digitised from tape carry a Whisper transcript beside them as
 * `.srt`, and the api converts it to WebVTT on the fly at /media/vtt/<path>.
 * That has worked since June 2026 and nothing ever rendered it — the video
 * players had no <track>, so a tape of someone's grandmother talking played
 * silently as far as captions were concerned.
 *
 * Only `heritage.subtitle_url` tells us a transcript actually exists. Guessing
 * the URL from the path would hand every video a captions button, most of them
 * leading to a 404 and an empty track.
 */
export function captionTrack(detail) {
  const src = detail?.heritage?.subtitle_url
  if (typeof src !== 'string' || !src) return null
  return { src, kind: 'captions', srcLang: 'en', label: 'Transcript' }
}

import { useState } from 'react'

/**
 * A video in the lightbox, and a sentence when it will not play.
 *
 * Split out of MediaDetail for the line limit, but it earns its own file: the
 * failure case is the whole reason it exists.
 *
 * A browser that cannot decode a file fires `error` on the element and then
 * draws an empty rectangle. No message, and nothing in the console a user
 * would ever see. iPhone Live Photo clips sat in that state for months — an
 * H.264 picture, which is fine, carrying a `pcm_s16le` audio track, which
 * Chromium's ISO-BMFF demuxer refuses, and it drops the whole file rather than
 * just the sound. About 4,200 clips. The only symptom anybody could report was
 * "it doesn't show anything in the lightbox", which is not something you can
 * act on.
 *
 * The fix for those clips is a web-playable proxy (workshop/tools/make_web_proxies.py,
 * served transparently by the api). This is the other half: when a file slips
 * through anyway, the archive says so out loud.
 */
export function DetailVideo({ src, poster, captions }) {
  // The failure is recorded against the src that produced it, not as a bare
  // boolean. Keying the <video> on src remounts the element but not this
  // component, so a bare flag survived the move to the next clip and reported
  // the previous file's failure against a video that plays perfectly well.
  const [failedSrc, setFailedSrc] = useState(null)
  const failed = failedSrc === src

  // A fragment, not a wrapper div, and that is the whole shape of this
  // component. A wrapper is a grid item of the detail pane with no height of
  // its own, so its height comes from its content -- and a percentage
  // max-height resolved against an auto-height containing block computes to
  // `none`. The `maxHeight: '100%'` below silently did nothing, a portrait
  // phone clip rendered at its intrinsic height, and the pane clipped it at
  // both ends because it is centred. The <img> branch of MediaDetail never had
  // this because it sits directly in the grid, whose area is definite.
  return (
    <>
      <video
        // Keyed on src so the element is rebuilt per clip. Chromium holds on
        // to the error state of a <video> whose src is swapped in place, which
        // leaves a working file unplayable after a broken one.
        key={src}
        src={src}
        poster={poster}
        controls
        onError={() => setFailedSrc(src)}
        // min-height 0 so the grid item is allowed to shrink; without it a
        // tall video overflows instead of fitting. objectFit matches the <img>
        // branch: letterbox inside the fitted box rather than stretch.
        style={{
          maxWidth: '100%', maxHeight: '100%',
          minHeight: 0, minWidth: 0,
          objectFit: 'contain',
        }}
      >
        {captions && <track default {...captions} />}
      </video>

      {failed && (
        <div
          role="alert"
          style={{
            position: 'absolute', bottom: '12%', left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 16px', borderRadius: 8, maxWidth: '36rem',
            // Explicit white, not the theme's text token: this sits on a
            // near-black panel of its own, so the token would be dark on dark.
            background: 'rgba(0,0,0,0.78)', color: '#fff',
            fontSize: 14, textAlign: 'center', lineHeight: 1.4,
          }}
        >
          This video won&apos;t play in the browser. The file itself is fine —
          it needs a web-playable copy made for it.
        </div>
      )}
    </>
  )
}

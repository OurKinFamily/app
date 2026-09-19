/**
 * The same tone curve the server applies, in the browser.
 *
 * Deliberately duplicated rather than fetched: the preview has to be exact,
 * or the reader approves one picture and a different one is written. The two
 * are kept honest by a test asserting the values match what the Python
 * produces, so a change to one that is not made to the other fails.
 *
 *     shadows     the dark end     weight (1-x)^2
 *     midtones    the middle       weight 4x(1-x), peaking at half brightness
 *     highlights  the bright end   weight x^2
 *
 * The weights overlap on purpose. Bands with hard edges leave a visible seam
 * where one stops and the next begins — a sky gaining a step halfway up.
 */

export const MAX_LIFT = 0.35

export function buildLut(shadows = 0, midtones = 0, highlights = 0) {
  const s = shadows / 100
  const m = midtones / 100
  const h = highlights / 100
  const lut = new Uint8ClampedArray(256)
  for (let i = 0; i < 256; i++) {
    const x = i / 255
    const lift =
      s * (1 - x) ** 2
      + m * 4 * x * (1 - x)
      + h * x ** 2
    lut[i] = Math.max(0, Math.min(255, Math.round((x + MAX_LIFT * lift) * 255)))
  }
  return lut
}

export const isNoop = (shadows, midtones, highlights) =>
  shadows === 0 && midtones === 0 && highlights === 0

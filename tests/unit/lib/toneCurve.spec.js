import { describe, it, expect } from 'vitest'
import { buildLut, isNoop } from '../../../src/lib/toneCurve'

/**
 * The browser previews the adjustment and the server writes it, from two
 * copies of the same curve. If they drift, somebody approves one photograph
 * and a different one lands on disk — so these values are taken from the
 * Python implementation and pin the two together.
 */
describe('the tone curve', () => {
  it('leaves the photograph alone when nothing is asked of it', () => {
    const lut = buildLut()
    expect([...lut]).toEqual([...lut].map((_, i) => i))
    expect(isNoop(0, 0, 0)).toBe(true)
  })

  it('matches the server, lifting shadows', () => {
    const lut = buildLut(50, 0, 0)
    expect(lut[0]).toBe(45)      // black is opened up
    expect(lut[128]).toBe(139)
    expect(lut[255]).toBe(255)   // white is untouched
  })

  it('matches the server, pulling highlights down', () => {
    const lut = buildLut(0, 0, -50)
    expect(lut[0]).toBe(0)       // black is untouched
    expect(lut[128]).toBe(117)
    expect(lut[255]).toBe(210)
  })

  it('never leaves the range, however hard it is pushed', () => {
    for (const lut of [buildLut(100, 100, 100), buildLut(-100, -100, -100)]) {
      expect(Math.min(...lut)).toBeGreaterThanOrEqual(0)
      expect(Math.max(...lut)).toBeLessThanOrEqual(255)
    }
  })
})

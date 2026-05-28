import { describe, it, expect } from 'vitest'
import { displayName, otherName } from '../../../src/lib/people'

describe('displayName', () => {
  it('prefers known_as when set', () => {
    expect(displayName({ name: 'Stephen E. Young', known_as: 'Stephen' })).toBe('Stephen')
  })
  it('falls back to name when known_as is missing', () => {
    expect(displayName({ name: 'Stephen E. Young' })).toBe('Stephen E. Young')
  })
  it('falls back to name when known_as is empty string', () => {
    expect(displayName({ name: 'Stephen E. Young', known_as: '' })).toBe('Stephen E. Young')
  })
})

describe('otherName', () => {
  it('returns the full name when known_as differs', () => {
    expect(otherName({ name: 'Stephen E. Young', known_as: 'Stephen' })).toBe('Stephen E. Young')
  })
  it('returns null when known_as matches name', () => {
    expect(otherName({ name: 'Stephen', known_as: 'Stephen' })).toBe(null)
  })
  it('returns null when known_as is missing', () => {
    expect(otherName({ name: 'Stephen' })).toBe(null)
  })
})

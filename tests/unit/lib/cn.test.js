import { describe, it, expect } from 'vitest'
import { cn } from '../../../src/lib/cn'

// `cn` is a thin wrapper over clsx + tailwind-merge. We aren't testing
// those libraries (banned) — only the contract our code relies on:
// it accepts variadic args, drops falsy values, merges duplicates so the
// later class wins.

describe('cn', () => {
  describe('argument handling', () => {
    it('joins multiple string arguments with a space', () => {
      expect(cn('a', 'b', 'c')).toBe('a b c')
    })
    it('drops falsy values', () => {
      expect(cn('a', null, undefined, false, '', 'b')).toBe('a b')
    })
    it('returns an empty string when no truthy inputs are given', () => {
      expect(cn()).toBe('')
      expect(cn(null, undefined, false)).toBe('')
    })
    it('flattens nested arrays', () => {
      expect(cn(['a', ['b', ['c']]])).toBe('a b c')
    })
    it('honors clsx object-form { class: condition }', () => {
      expect(cn({ a: true, b: false, c: true })).toBe('a c')
    })
  })

  describe('tailwind-merge contract', () => {
    it('keeps the later tailwind class when two conflict', () => {
      // The whole reason we layer twMerge on top of clsx — last writer wins.
      expect(cn('p-2', 'p-4')).toBe('p-4')
    })
    it('preserves unrelated classes alongside merged ones', () => {
      expect(cn('text-sm p-2', 'p-4 font-bold')).toBe('text-sm p-4 font-bold')
    })
  })
})

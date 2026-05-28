// Regression: Avatar threw `TypeError: (name || "").split is not a function`
// on the person detail page when a caller passed a non-string `name` (number,
// object, array). The `name || ''` fallback only catches null/undefined/'',
// not "truthy but not a string." Caught May 2026.
import { createElement } from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Avatar } from '../../../src/components/Avatar'

describe('Avatar: non-string name prop must not throw', () => {
  const cases = [
    ['null', null],
    ['undefined', undefined],
    ['number', 1986],
    ['object', { first: 'Stephen', last: 'Young' }],
    ['array', ['Stephen', 'Young']],
  ]

  for (const [label, value] of cases) {
    it(`renders empty initials and does not throw for ${label}`, () => {
      let container
      expect(() => {
        ;({ container } = render(createElement(Avatar, { name: value })))
      }).not.toThrow()
      // Pre-fix behavior the test guards against:
      //   - number → `(1986).split` is not a function → TypeError
      //   - object → `({...}).split` is not a function → TypeError
      //   - array  → `.split` doesn't exist on arrays → TypeError
      //     (and even if it did, would yield garbage like "[O" from a
      //     stringified element). Post-fix: empty initials.
      expect(container.firstChild?.textContent).toBe('')
    })
  }
})

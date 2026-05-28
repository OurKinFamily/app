import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Textarea } from '../../../src/components/Textarea'

describe('Textarea', () => {
  it('renders a <textarea> element', () => {
    const { container } = render(<Textarea placeholder="Notes" />)
    const ta = container.querySelector('textarea')
    expect(ta).not.toBe(null)
    expect(ta).toHaveAttribute('placeholder', 'Notes')
  })

  describe('value + change', () => {
    it('forwards value and onChange', () => {
      const onChange = vi.fn()
      render(<Textarea value="hello" onChange={onChange} />)
      const ta = screen.getByDisplayValue('hello')
      fireEvent.change(ta, { target: { value: 'edited' } })
      expect(onChange).toHaveBeenCalledTimes(1)
    })
  })

  describe('error state', () => {
    it('sets aria-invalid when error is truthy', () => {
      const { container } = render(<Textarea error />)
      expect(container.querySelector('textarea')).toHaveAttribute('aria-invalid', 'true')
    })
    it('omits aria-invalid when error is falsy', () => {
      const { container } = render(<Textarea />)
      expect(container.querySelector('textarea')).not.toHaveAttribute('aria-invalid')
    })
  })
})

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from '../../../src/components/Input'

describe('Input', () => {
  it('renders an <input> element', () => {
    const { container } = render(<Input placeholder="Name" />)
    const input = container.querySelector('input')
    expect(input).not.toBe(null)
    expect(input).toHaveAttribute('placeholder', 'Name')
  })

  describe('value + change', () => {
    it('forwards value and onChange', () => {
      const onChange = vi.fn()
      render(<Input value="initial" onChange={onChange} />)
      const input = screen.getByDisplayValue('initial')
      fireEvent.change(input, { target: { value: 'edited' } })
      expect(onChange).toHaveBeenCalledTimes(1)
    })
  })

  describe('error state', () => {
    it('sets aria-invalid when error is truthy', () => {
      const { container } = render(<Input error />)
      expect(container.querySelector('input')).toHaveAttribute('aria-invalid', 'true')
    })
    it('omits aria-invalid when error is falsy', () => {
      const { container } = render(<Input />)
      expect(container.querySelector('input')).not.toHaveAttribute('aria-invalid')
    })
  })

  describe('forwarded props', () => {
    it('forwards type, name, and id', () => {
      const { container } = render(<Input type="email" name="email" id="e" />)
      const input = container.querySelector('input')
      expect(input).toHaveAttribute('type', 'email')
      expect(input).toHaveAttribute('name', 'email')
      expect(input).toHaveAttribute('id', 'e')
    })
  })
})

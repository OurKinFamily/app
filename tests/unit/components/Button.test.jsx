import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '../../../src/components/Button'

describe('Button', () => {
  it('renders its children as the button text', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })
  it('forwards the onClick handler', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)
    screen.getByRole('button').click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })
  it('honors a custom button type', () => {
    render(<Button type="submit">Go</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })
  it('forwards the disabled prop to the underlying <button>', () => {
    render(<Button disabled>Save</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
  it('does not fire onClick when disabled', () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Save</Button>)
    screen.getByRole('button').click()
    expect(onClick).not.toHaveBeenCalled()
  })
  it('forwards arbitrary extra props (aria-label, data-*)', () => {
    render(<Button aria-label="save changes" data-marker="x">Save</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('aria-label', 'save changes')
    expect(btn).toHaveAttribute('data-marker', 'x')
  })
})

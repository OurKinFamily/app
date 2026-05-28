import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StripFrame } from '../../../src/components/StripFrame'

const IMG = { src: 'https://example.com/x.jpg', alt: 'x' }

describe('StripFrame', () => {
  it('renders the image as a non-interactive <div> when no onClick', () => {
    const { container } = render(<StripFrame image={IMG} />)
    expect(container.querySelector('button')).toBeNull()
    expect(container.querySelector('img')).toHaveAttribute('src', IMG.src)
  })

  it('renders the image as a <button> when onClick is supplied', () => {
    const onClick = vi.fn()
    render(<StripFrame image={IMG} onClick={onClick} title="hi" />)
    fireEvent.click(screen.getByTitle('hi'))
    expect(onClick).toHaveBeenCalled()
  })

  it('shows the caption ribbon when caption is provided', () => {
    render(<StripFrame image={IMG} caption="age 8" />)
    expect(screen.getByText('age 8')).toBeInTheDocument()
  })

  it('renders the avatar overlay when avatar is provided', () => {
    const { container } = render(
      <StripFrame image={IMG} avatar={{ src: 'crop.jpg', alt: 'face' }} />
    )
    expect(container.querySelectorAll('img').length).toBe(2)
  })

  it('omits the avatar overlay when not provided', () => {
    const { container } = render(<StripFrame image={IMG} />)
    expect(container.querySelectorAll('img').length).toBe(1)
  })

  it('renders the badge slot', () => {
    render(<StripFrame image={IMG} badge={<span data-testid="b">B</span>} />)
    expect(screen.getByTestId('b')).toBeInTheDocument()
  })

  it('renders one button per action and wires onClick', () => {
    const a = vi.fn()
    const b = vi.fn()
    render(
      <StripFrame
        image={IMG}
        actions={[
          { icon: <span data-testid="a-icon" />, title: 'A', onClick: a },
          { icon: <span data-testid="b-icon" />, title: 'B', onClick: b },
        ]}
      />
    )
    fireEvent.click(screen.getByTitle('A'))
    fireEvent.click(screen.getByTitle('B'))
    expect(a).toHaveBeenCalled()
    expect(b).toHaveBeenCalled()
  })

  it('uses the action.tone class when provided', () => {
    render(
      <StripFrame
        image={IMG}
        actions={[
          { icon: <span />, title: 'A', tone: 'text-emerald-400 hover:text-emerald-300', onClick: () => {} },
        ]}
      />
    )
    expect(screen.getByTitle('A').className).toMatch(/text-emerald-400/)
  })

  it('uses a default tone when action.tone is omitted', () => {
    render(
      <StripFrame
        image={IMG}
        actions={[{ icon: <span />, title: 'A', onClick: () => {} }]}
      />
    )
    expect(screen.getByTitle('A').className).toMatch(/text-white\/80/)
  })

  it('renders the dark hover overlay only when actions are present', () => {
    const { container, rerender } = render(<StripFrame image={IMG} />)
    expect(container.querySelector('.bg-black\\/65')).toBeNull()
    rerender(
      <StripFrame image={IMG} actions={[{ icon: <span />, title: 'A', onClick: () => {} }]} />
    )
    expect(container.querySelector('.bg-black\\/65')).toBeTruthy()
  })

  it('falls back to an empty string alt when image.alt is not given (div branch)', () => {
    const { container } = render(<StripFrame image={{ src: 'x' }} />)
    expect(container.querySelector('img').getAttribute('alt')).toBe('')
  })

  it('falls back to an empty string alt when image.alt is not given (button branch)', () => {
    const { container } = render(
      <StripFrame image={{ src: 'x' }} onClick={() => {}} />
    )
    expect(container.querySelector('img').getAttribute('alt')).toBe('')
  })

  it('falls back to an empty string alt when avatar.alt is not given', () => {
    const { container } = render(
      <StripFrame image={IMG} avatar={{ src: 'crop.jpg' }} />
    )
    const imgs = container.querySelectorAll('img')
    expect(imgs[1].getAttribute('alt')).toBe('')
  })

  it('respects a custom size', () => {
    const { container } = render(<StripFrame image={IMG} size={48} />)
    const square = container.querySelector('[style*="width"]')
    expect(square.style.width).toBe('48px')
    expect(square.style.height).toBe('48px')
  })
})

import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { PhotoStrip } from '../../../src/components/PhotoStrip'

describe('PhotoStrip', () => {
  it('renders its children inside the scrollable track', () => {
    const { getByTestId } = render(
      <PhotoStrip>
        <div data-testid="kid">a</div>
      </PhotoStrip>
    )
    expect(getByTestId('kid')).toBeInTheDocument()
  })

  it('renders a leader cap at the start and end of the track', () => {
    const { container } = render(
      <PhotoStrip>
        <div data-testid="kid">a</div>
      </PhotoStrip>
    )
    // The two leaders are the only bg-zinc-100 divs in the strip.
    expect(container.querySelectorAll('.bg-zinc-100').length).toBe(2)
  })

  it('converts vertical wheel into horizontal scroll', () => {
    const { container } = render(
      <PhotoStrip>
        <div>a</div>
      </PhotoStrip>
    )
    const scroller = container.querySelector('.overflow-x-auto')
    scroller.scrollLeft = 0
    fireEvent.wheel(scroller, { deltaY: 120 })
    expect(scroller.scrollLeft).toBe(120)
  })

  it('ignores wheel events whose deltaY is 0', () => {
    const { container } = render(
      <PhotoStrip>
        <div>a</div>
      </PhotoStrip>
    )
    const scroller = container.querySelector('.overflow-x-auto')
    scroller.scrollLeft = 50
    fireEvent.wheel(scroller, { deltaY: 0 })
    expect(scroller.scrollLeft).toBe(50)
  })

  it('merges an extra className prop onto the film body', () => {
    const { container } = render(
      <PhotoStrip className="extra-class">
        <div>a</div>
      </PhotoStrip>
    )
    expect(container.querySelector('.extra-class')).toBeTruthy()
  })
})

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DetailSection } from '../../../src/components/DetailSection'

describe('DetailSection', () => {
  it('renders the title', () => {
    render(<DetailSection title="Faces"><div /></DetailSection>)
    expect(screen.getByText('Faces')).toBeInTheDocument()
  })
  it('renders its children inside the section', () => {
    render(
      <DetailSection title="Faces">
        <div data-testid="body">contents</div>
      </DetailSection>
    )
    expect(screen.getByTestId('body')).toBeInTheDocument()
  })
  it('uses a <section> as the wrapper element', () => {
    const { container } = render(<DetailSection title="t"><div /></DetailSection>)
    expect(container.querySelector('section')).not.toBe(null)
  })
})

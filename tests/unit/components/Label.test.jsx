import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Label } from '../../../src/components/Label'

describe('Label', () => {
  describe('basic rendering', () => {
    it('renders its children as the label text', () => {
      render(<Label>Email</Label>)
      expect(screen.getByText('Email')).toBeInTheDocument()
    })
    it('associates with a form input via htmlFor', () => {
      render(<Label htmlFor="email-input">Email</Label>)
      // a <label htmlFor="x"> exposes `for` in the DOM; assert via attribute.
      const label = screen.getByText('Email').closest('label')
      expect(label).toHaveAttribute('for', 'email-input')
    })
  })

  describe('required marker', () => {
    it('shows a "*" when required is true', () => {
      render(<Label required>Email</Label>)
      expect(screen.getByText('*')).toBeInTheDocument()
    })
    it('omits the marker when required is false / undefined', () => {
      render(<Label>Email</Label>)
      expect(screen.queryByText('*')).not.toBeInTheDocument()
    })
  })

  describe('hint', () => {
    it('renders the hint after the label text', () => {
      render(<Label hint="(optional)">Nickname</Label>)
      expect(screen.getByText('(optional)')).toBeInTheDocument()
    })
    it('omits the hint span when no hint is given', () => {
      render(<Label>Nickname</Label>)
      expect(screen.queryByText('(optional)')).not.toBeInTheDocument()
    })
  })
})

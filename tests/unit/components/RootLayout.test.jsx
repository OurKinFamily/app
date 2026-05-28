import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RootLayout } from '../../../src/components/RootLayout'

describe('RootLayout', () => {
  it('renders the matched child route inside the <Outlet/>', () => {
    render(
      <MemoryRouter initialEntries={['/foo']}>
        <Routes>
          <Route element={<RootLayout />}>
            <Route path="/foo" element={<span data-testid="child">hello</span>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })
})

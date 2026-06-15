import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, render } from '@testing-library/react'
import { Route, Routes, MemoryRouter } from 'react-router-dom'
import { GalleryOnly } from '../../../src/components/GalleryOnly'

const mockMe = vi.fn()
vi.mock('../../../src/contexts/MeContext', () => ({
  useMe: () => mockMe(),
  homePath: () => '/home-sentinel',
}))

function renderGuard(me) {
  mockMe.mockReturnValue(me)
  return render(
    <MemoryRouter initialEntries={['/gallery']}>
      <Routes>
        <Route element={<GalleryOnly />}>
          <Route path="/gallery" element={<div>gallery content</div>} />
        </Route>
        <Route path="/home-sentinel" element={<div>home</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('GalleryOnly', () => {
  beforeEach(() => { mockMe.mockReset() })

  it('renders nothing while loading', () => {
    const { container } = renderGuard({ loading: true })
    expect(container.firstChild).toBeNull()
  })

  it('lets a gallery viewer through', () => {
    renderGuard({ loading: false, me: { can_see_gallery: true } })
    expect(screen.getByText('gallery content')).toBeInTheDocument()
  })

  it('redirects a non-gallery family viewer to their home', () => {
    renderGuard({ loading: false, me: { can_see_gallery: false } })
    expect(screen.getByText('home')).toBeInTheDocument()
    expect(screen.queryByText('gallery content')).not.toBeInTheDocument()
  })
})

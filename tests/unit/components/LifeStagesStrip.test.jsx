import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { LifeStagesStrip } from '../../../src/components/LifeStagesStrip'
import { renderWithRouter, mockFetch, mockFetchFail } from '../helpers'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => navigateMock }
})

const bucket = (overrides = {}) => ({
  bucket: 'kid',
  age_text: 'age 8',
  path: 'archive/1994/05/p.jpg',
  url: '/api/media/archive/1994/05/p.jpg',
  thumb_url: '/api/media/thumb/archive/1994/05/p.jpg',
  crop_url: null,
  is_video: false,
  count: 3,
  ...overrides,
})

describe('LifeStagesStrip', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    navigateMock.mockReset()
  })

  it('renders nothing while loading (pending fetch)', () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}))
    const { container } = renderWithRouter(<LifeStagesStrip personId="p1" />)
    expect(container.textContent).toBe('')
  })

  it('renders nothing when the API returns no buckets', async () => {
    mockFetch({ buckets: [] })
    const { container } = renderWithRouter(<LifeStagesStrip personId="p1" />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(container.textContent).toBe('')
  })

  it('renders nothing on a non-ok response', async () => {
    mockFetch(null, { ok: false })
    const { container } = renderWithRouter(<LifeStagesStrip personId="p1" />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(container.textContent).toBe('')
  })

  it('survives a fetch rejection without throwing', async () => {
    mockFetchFail(new Error('net'))
    const { container } = renderWithRouter(<LifeStagesStrip personId="p1" />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(container.textContent).toBe('')
  })

  it('skips the fetch entirely when no personId is supplied', () => {
    const fn = vi.fn()
    global.fetch = fn
    renderWithRouter(<LifeStagesStrip personId={null} />)
    expect(fn).not.toHaveBeenCalled()
  })

  it('renders one tile per bucket with the age caption', async () => {
    mockFetch({
      buckets: [
        bucket({ bucket: 'baby',    age_text: 'newborn', path: 'a.jpg' }),
        bucket({ bucket: 'toddler', age_text: 'age 2',   path: 'b.jpg' }),
      ],
    })
    renderWithRouter(<LifeStagesStrip personId="p1" />)
    await waitFor(() => expect(screen.getByText('Through the years')).toBeInTheDocument())
    expect(screen.getByText('newborn')).toBeInTheDocument()
    expect(screen.getByText('age 2')).toBeInTheDocument()
    expect(screen.getAllByRole('button').length).toBe(2)
  })

  it('clicking a tile navigates to /gallery/photo/<path>', async () => {
    mockFetch({ buckets: [bucket({ path: 'archive/1994/05/p.jpg' })] })
    renderWithRouter(<LifeStagesStrip personId="p1" />)
    await waitFor(() => screen.getByText('age 8'))
    fireEvent.click(screen.getByRole('button'))
    expect(navigateMock).toHaveBeenCalledWith('/gallery/photo/archive/1994/05/p.jpg')
  })

  it('renders the face crop overlay when crop_url is present', async () => {
    mockFetch({ buckets: [bucket({ crop_url: '/api/media/__faces/crops/x.jpg' })] })
    const { container } = renderWithRouter(<LifeStagesStrip personId="p1" />)
    await waitFor(() => screen.getByText('age 8'))
    // 2 <img> tags: the thumb + the crop circle (crop uses alt="" so it
    // doesn't expose an img role to AT — query the DOM directly).
    expect(container.querySelectorAll('img').length).toBe(2)
  })

  it('omits the crop overlay when crop_url is null', async () => {
    mockFetch({ buckets: [bucket({ crop_url: null })] })
    const { container } = renderWithRouter(<LifeStagesStrip personId="p1" />)
    await waitFor(() => screen.getByText('age 8'))
    expect(container.querySelectorAll('img').length).toBe(1)
  })

  it('builds a title attribute that uses singular "photo" for count=1', async () => {
    mockFetch({ buckets: [bucket({ count: 1 })] })
    renderWithRouter(<LifeStagesStrip personId="p1" />)
    await waitFor(() => screen.getByText('age 8'))
    expect(screen.getByRole('button')).toHaveAttribute('title', 'kid · 1 photo')
  })

  it('builds a title attribute that uses plural "photos" for count>1', async () => {
    mockFetch({ buckets: [bucket({ count: 4 })] })
    renderWithRouter(<LifeStagesStrip personId="p1" />)
    await waitFor(() => screen.getByText('age 8'))
    expect(screen.getByRole('button')).toHaveAttribute('title', 'kid · 4 photos')
  })

  describe('wheel-to-horizontal scroll', () => {
    it('converts vertical wheel delta into horizontal scrollLeft', async () => {
      mockFetch({ buckets: [bucket({ path: 'a.jpg' })] })
      const { container } = renderWithRouter(<LifeStagesStrip personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      const scroller = container.querySelector('.overflow-x-auto')
      scroller.scrollLeft = 0
      fireEvent.wheel(scroller, { deltaY: 120 })
      expect(scroller.scrollLeft).toBe(120)
    })

    it('ignores wheel events whose deltaY is 0', async () => {
      mockFetch({ buckets: [bucket({ path: 'a.jpg' })] })
      const { container } = renderWithRouter(<LifeStagesStrip personId="p1" />)
      await waitFor(() => screen.getByText('age 8'))
      const scroller = container.querySelector('.overflow-x-auto')
      scroller.scrollLeft = 50
      fireEvent.wheel(scroller, { deltaY: 0 })
      expect(scroller.scrollLeft).toBe(50)
    })
  })

  it('falls back to an empty array when the API response lacks `buckets`', async () => {
    mockFetch({})
    const { container } = renderWithRouter(<LifeStagesStrip personId="p1" />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(container.textContent).toBe('')
  })
})

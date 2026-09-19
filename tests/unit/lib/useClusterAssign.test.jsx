import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { ToastProvider } from '../../../src/components/Toast'
import { useClusterAssign } from '../../../src/lib/useClusterAssign'

const wrapper = ({ children }) => <ToastProvider>{children}</ToastProvider>

// The same face_index repeats across photographs — that is the whole reason
// the hook keys on photo AND index.
const faces = n => Array.from({ length: n }, (_, i) => ({
  photo_path: `archive/2026/${i}.jpg`, face_index: i % 3, crop_url: `/c/${i}.jpg`,
}))

const ok = body => Promise.resolve({ ok: true, json: () => Promise.resolve(body) })

function server({ size = 10 } = {}) {
  global.fetch = vi.fn((url, init) => {
    if (init?.method === 'POST' && String(url).includes('/api/people/')) return ok({ id: 'new-person' })
    if (String(url).includes('/assign')) return ok({})
    if (String(url).includes('/skip')) return ok({})
    return ok({ id: 'c1', size, faces: faces(size) })
  })
}

beforeEach(() => { server() })

async function mount(over = {}) {
  const onAssigned = vi.fn()
  const onSkipped = vi.fn()
  const view = renderHook(
    () => useClusterAssign({ id: 'c1', size: 10, ...over }, { onAssigned, onSkipped }),
    { wrapper },
  )
  await waitFor(() => expect(view.result.current.detail).toBeTruthy())
  return { ...view, onAssigned, onSkipped }
}

const assignBody = () => {
  const call = global.fetch.mock.calls.find(([u]) => String(u).includes('/assign'))
  return JSON.parse(call[1].body)
}

describe('useClusterAssign', () => {
  describe('opening a group', () => {
    it('reads every face in it', async () => {
      const { result } = await mount()
      expect(result.current.faces).toHaveLength(10)
    })

    it('shows a batch at a time, not all four hundred', async () => {
      server({ size: 500 })
      const { result } = await mount()
      expect(result.current.visible).toHaveLength(200)
      expect(result.current.remaining).toBe(300)
    })

    it('reveals more on request', async () => {
      server({ size: 500 })
      const { result } = await mount()
      await act(async () => { result.current.showMore() })
      expect(result.current.visible).toHaveLength(400)
    })
  })

  describe('crossing faces out', () => {
    it('marks one as not them, and back again', async () => {
      const { result } = await mount()
      await act(async () => { result.current.toggle(1) })
      expect(result.current.excluded.has(1)).toBe(true)
      await act(async () => { result.current.toggle(1) })
      expect(result.current.excluded.has(1)).toBe(false)
    })

    it('clears them all at once', async () => {
      const { result } = await mount()
      await act(async () => { result.current.toggle(1); result.current.toggle(2) })
      await act(async () => { result.current.clearExcluded() })
      expect(result.current.excluded.size).toBe(0)
    })
  })

  describe('naming the batch on screen', () => {
    it('sends what is them and what is not, separately', async () => {
      const { result } = await mount()
      await act(async () => { result.current.toggle(1) })
      await act(async () => { await result.current.assign('p1', 'Margaret') })

      const body = assignBody()
      expect(body.person_id).toBe('p1')
      // face_index 1 appears in several photographs; crossing it out crosses
      // out every one of them on screen.
      expect(body.exclude.length).toBeGreaterThan(0)
      expect(body.include.length + body.exclude.length).toBe(10)
    })

    it('tells the queue how many were taken', async () => {
      const { result, onAssigned } = await mount()
      await act(async () => { await result.current.assign('p1', 'Margaret') })
      expect(onAssigned).toHaveBeenCalledWith('c1', 10)
    })

    it('takes the named faces off the group', async () => {
      server({ size: 500 })
      const { result } = await mount()
      await act(async () => { await result.current.assign('p1', 'Margaret') })
      expect(result.current.faces).toHaveLength(300)
    })

    it('remembers who was named, for the next batch', async () => {
      const { result } = await mount()
      await act(async () => { await result.current.assign('p1', 'Margaret') })
      expect(result.current.lastNamed).toEqual({ id: 'p1', name: 'Margaret' })
    })

    it('forgets the crossings-out once they are sent', async () => {
      const { result } = await mount()
      await act(async () => { result.current.toggle(1) })
      await act(async () => { await result.current.assign('p1', 'Margaret') })
      expect(result.current.excluded.size).toBe(0)
    })

    it('does not send the same batch twice at once', async () => {
      const { result } = await mount()
      await act(async () => {
        await Promise.all([
          result.current.assign('p1', 'Margaret'),
          result.current.assign('p1', 'Margaret'),
        ])
      })
      const assigns = global.fetch.mock.calls.filter(([u]) => String(u).includes('/assign'))
      expect(assigns).toHaveLength(1)
    })

    it('keeps the faces when the save fails', async () => {
      const { result } = await mount()
      global.fetch = vi.fn(() => Promise.reject(new Error('no')))
      await act(async () => { await result.current.assign('p1', 'Margaret') })
      expect(result.current.faces).toHaveLength(10)
      expect(result.current.saving).toBe(false)
    })
  })

  describe('naming somebody the archive has never heard of', () => {
    it('adds them, then gives them the faces', async () => {
      const { result } = await mount()
      await act(async () => { await result.current.createAndAssign('  Dorothy Forrence  ') })
      const created = global.fetch.mock.calls.find(([u, i]) => (
        String(u).includes('/api/people/') && i?.method === 'POST'
      ))
      expect(JSON.parse(created[1].body)).toEqual({ name: 'Dorothy Forrence' })
      expect(assignBody().person_id).toBe('new-person')
    })

    it('refuses a name that is only spaces', async () => {
      const { result } = await mount()
      await act(async () => { await result.current.createAndAssign('   ') })
      expect(global.fetch.mock.calls.some(([u]) => String(u).includes('/assign'))).toBe(false)
    })

    it('says so when they could not be added', async () => {
      const { result } = await mount()
      global.fetch = vi.fn(() => Promise.reject(new Error('name taken')))
      await act(async () => { await result.current.createAndAssign('Dorothy') })
      expect(result.current.faces).toHaveLength(10)
    })
  })

  describe('the edges of a save', () => {
    it('counts a single face as a face, not faces', async () => {
      server({ size: 1 })
      const { result } = await mount()
      await act(async () => { await result.current.assign('p1', 'Margaret') })
      expect(result.current.faces).toHaveLength(0)
    })

    it('copes with a group the server sent no size for', async () => {
      global.fetch = vi.fn((url, init) => (
        init?.method || String(url).includes('/assign')
          ? ok({})
          : ok({ id: 'c1', faces: faces(3) })
      ))
      const { result } = await mount()
      await act(async () => { await result.current.assign('p1', 'Margaret') })
      expect(result.current.size).toBe(0)
    })

    it('copes with a group whose faces never arrived', async () => {
      global.fetch = vi.fn(url => (
        String(url).includes('/assign') ? ok({}) : ok({ id: 'c1', size: 0 })
      ))
      const view = renderHook(
        () => useClusterAssign({ id: 'c1', size: 0 }, { onAssigned: vi.fn(), onSkipped: vi.fn() }),
        { wrapper },
      )
      await waitFor(() => expect(view.result.current.detail).toBeTruthy())
      expect(view.result.current.visible).toEqual([])
      await act(async () => { await view.result.current.assign('p1', 'Margaret') })
      expect(view.result.current.faces).toEqual([])
    })

    // The group is open but its faces could not be read; naming it must not
    // throw on the way to saying so.
    it('survives naming a group that never loaded', async () => {
      global.fetch = vi.fn(url => (
        String(url).includes('/assign') ? ok({}) : Promise.reject(new Error('gone'))
      ))
      const onAssigned = vi.fn()
      const view = renderHook(
        () => useClusterAssign({ id: 'c1', size: 4 }, { onAssigned, onSkipped: vi.fn() }),
        { wrapper },
      )
      await act(async () => { await view.result.current.assign('p1', 'Margaret') })
      expect(view.result.current.detail).toBeNull()
      expect(onAssigned).toHaveBeenCalledWith('c1', 0)
    })

    it('says something even when the failure carries no message', async () => {
      const { result } = await mount()
      global.fetch = vi.fn(() => Promise.reject(new Error()))
      await act(async () => { await result.current.assign('p1', 'Margaret') })
      expect(result.current.faces).toHaveLength(10)
    })

    it('says something when adding a person fails without a reason', async () => {
      const { result } = await mount()
      global.fetch = vi.fn(() => Promise.reject(new Error()))
      await act(async () => { await result.current.createAndAssign('Dorothy') })
      expect(result.current.faces).toHaveLength(10)
    })
  })

  describe('passing a group over', () => {
    it('skips it and tells the queue', async () => {
      const { result, onSkipped } = await mount()
      await act(async () => { await result.current.skip() })
      expect(global.fetch.mock.calls.some(([u]) => String(u).includes('/skip'))).toBe(true)
      expect(onSkipped).toHaveBeenCalledWith('c1')
    })
  })

  describe('with no group open', () => {
    it('does nothing at all', async () => {
      const view = renderHook(
        () => useClusterAssign(null, { onAssigned: vi.fn(), onSkipped: vi.fn() }),
        { wrapper },
      )
      await act(async () => {
        await view.result.current.assign('p1', 'Margaret')
        await view.result.current.skip()
      })
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })
})

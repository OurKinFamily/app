import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { ToastProvider } from '../../../src/components/Toast'
import {
  useUpload, fileOutcome, isVideoName, DESTINATIONS,
} from '../../../src/lib/useUpload'

const wrapper = ({ children }) => <ToastProvider>{children}</ToastProvider>
const file = name => new File(['x'], name, { type: 'image/jpeg' })

beforeEach(() => {
  global.URL.createObjectURL = vi.fn(() => 'blob:preview')
  global.URL.revokeObjectURL = vi.fn()
  global.fetch = vi.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ id: 'job-1', status: 'running', files: [{ filename: 'a.jpg' }] }),
  }))
})

const mount = () => renderHook(() => useUpload(), { wrapper })

describe('isVideoName', () => {
  it.each(['a.mp4', 'a.MOV', 'a.mkv', 'a.3gp'])('knows %s is film', (name) => {
    expect(isVideoName(name)).toBe(true)
  })

  it.each(['a.jpg', 'a.heic', 'a.png'])('knows %s is not', (name) => {
    expect(isVideoName(name)).toBe(false)
  })
})

describe('fileOutcome', () => {
  it('says plainly when the archive already had it', () => {
    expect(fileOutcome({ status: 'duplicate' })).toBe('Already in the archive')
  })

  it('passes the reason along when one is given', () => {
    expect(fileOutcome({ status: 'error', error: 'not an image' })).toBe('not an image')
  })

  it('says something even when no reason came back', () => {
    expect(fileOutcome({ status: 'error' })).toBe('Did not work')
  })

  it('shows the date it landed on', () => {
    expect(fileOutcome({ status: 'done', timestamp: '1974-08-03T12:00:00' })).toBe('1974-08-03')
  })

  // Worth knowing at the moment of upload rather than finding it in the
  // gallery filed under 1970.
  it('says when it could not find a date at all', () => {
    expect(fileOutcome({ status: 'done' })).toBe('No date on it')
  })

  it('says it is still going otherwise', () => {
    expect(fileOutcome({ status: 'pending' })).toBe('Working…')
  })
})

describe('useUpload', () => {
  describe('choosing files', () => {
    it('takes photographs and film', async () => {
      const { result } = mount()
      await act(async () => { result.current.add([file('a.jpg'), file('b.mov')]) })
      expect(result.current.picked).toHaveLength(2)
    })

    it('ignores anything that is neither', async () => {
      const { result } = mount()
      await act(async () => { result.current.add([file('notes.pdf'), file('a.jpg')]) })
      expect(result.current.picked.map(p => p.file.name)).toEqual(['a.jpg'])
    })

    it('adds to what was already chosen', async () => {
      const { result } = mount()
      await act(async () => { result.current.add([file('a.jpg')]) })
      await act(async () => { result.current.add([file('b.jpg')]) })
      expect(result.current.picked).toHaveLength(2)
    })

    // The browser holds the whole file behind each preview URL until it is
    // revoked, and a batch of four hundred photographs is gigabytes.
    it('releases the preview when one is taken back off', async () => {
      const { result } = mount()
      await act(async () => { result.current.add([file('a.jpg'), file('b.jpg')]) })
      await act(async () => { result.current.drop(0) })
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
      expect(result.current.picked.map(p => p.file.name)).toEqual(['b.jpg'])
    })

    it('releases all of them when the list is cleared', async () => {
      const { result } = mount()
      await act(async () => { result.current.add([file('a.jpg'), file('b.jpg')]) })
      global.URL.revokeObjectURL.mockClear()
      await act(async () => { result.current.clear() })
      expect(global.URL.revokeObjectURL).toHaveBeenCalledTimes(2)
      expect(result.current.picked).toEqual([])
    })

    // The previews of files already chosen must survive another batch being
    // added; see tests/unit/regression for the bug this replaced.
    it('keeps earlier previews alive when more are chosen', async () => {
      const { result } = mount()
      await act(async () => { result.current.add([file('a.jpg')]) })
      global.URL.revokeObjectURL.mockClear()
      await act(async () => { result.current.add([file('b.jpg')]) })
      expect(global.URL.revokeObjectURL).not.toHaveBeenCalled()
    })
  })

  describe('where they land', () => {
    it('holds them for review by default', () => {
      const { result } = mount()
      expect(result.current.destination).toBe('staging')
      expect(DESTINATIONS[0].key).toBe('staging')
    })

    // Dates come out wrong and screenshots get swept up, and the gallery is
    // the thing the whole family opens.
    it('asks twice before putting them straight in the gallery', async () => {
      const { result } = mount()
      await act(async () => { result.current.add([file('a.jpg')]) })
      await act(async () => { result.current.setDestination('gallery') })
      expect(result.current.needsConfirming).toBe(true)
      expect(result.current.canSend).toBe(false)

      await act(async () => { result.current.setConfirmed(true) })
      expect(result.current.canSend).toBe(true)
    })

    it('forgets the confirmation if the destination changes again', async () => {
      const { result } = mount()
      await act(async () => { result.current.add([file('a.jpg')]) })
      await act(async () => { result.current.setDestination('gallery') })
      await act(async () => { result.current.setConfirmed(true) })
      await act(async () => { result.current.setDestination('staging') })
      await act(async () => { result.current.setDestination('gallery') })
      expect(result.current.needsConfirming).toBe(true)
    })

    it('needs no second question for the holding area', async () => {
      const { result } = mount()
      await act(async () => { result.current.add([file('a.jpg')]) })
      expect(result.current.canSend).toBe(true)
    })

    it('cannot send nothing', () => {
      const { result } = mount()
      expect(result.current.canSend).toBe(false)
    })
  })

  describe('sending them', () => {
    it('clears the chosen list once they are on their way', async () => {
      const { result } = mount()
      await act(async () => { result.current.add([file('a.jpg')]) })
      await act(async () => { await result.current.send() })
      expect(result.current.picked).toEqual([])
      expect(result.current.job).toMatchObject({ id: 'job-1' })
    })

    it('counts them properly when there is more than one', async () => {
      const { result } = mount()
      await act(async () => { result.current.add([file('a.jpg'), file('b.jpg')]) })
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'job-1', status: 'done', files: [{}, {}] }),
      }))
      await act(async () => { await result.current.send() })
      expect(result.current.job.files).toHaveLength(2)
    })

    it('says something even when the failure carries no message', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error()))
      const { result } = mount()
      await act(async () => { result.current.add([file('a.jpg')]) })
      await act(async () => { await result.current.send() })
      expect(result.current.picked).toHaveLength(1)
    })

    it('does nothing when there is nothing to send', async () => {
      const { result } = mount()
      await act(async () => { await result.current.send() })
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('keeps the files when the upload fails, so they can be retried', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('no room')))
      const { result } = mount()
      await act(async () => { result.current.add([file('a.jpg')]) })
      await act(async () => { await result.current.send() })
      expect(result.current.picked).toHaveLength(1)
      expect(result.current.busy).toBe(false)
    })
  })

  describe('watching the import', () => {
    beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }) })
    afterEach(() => { vi.useRealTimers() })

    it('keeps asking until it is finished', async () => {
      const { result } = mount()
      await act(async () => { result.current.add([file('a.jpg')]) })
      await act(async () => { await result.current.send() })

      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'job-1', status: 'done', files: [
          { status: 'done' }, { status: 'duplicate' }, { status: 'error' },
        ] }),
      }))
      await act(async () => { await vi.advanceTimersByTimeAsync(1500) })
      await waitFor(() => expect(result.current.job.status).toBe('done'))
      expect(result.current.summary).toEqual({ added: 1, duplicate: 1, failed: 1 })
    })

    it('stops asking once it is done', async () => {
      const { result } = mount()
      await act(async () => { result.current.add([file('a.jpg')]) })
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true, json: () => Promise.resolve({ id: 'job-1', status: 'done', files: [] }),
      }))
      await act(async () => { await result.current.send() })
      const after = global.fetch.mock.calls.length
      await act(async () => { await vi.advanceTimersByTimeAsync(6000) })
      expect(global.fetch.mock.calls.length).toBe(after)
    })

    // A dropped poll mid-import is not worth an error; the next one usually
    // answers.
    it('keeps asking through a dropped answer', async () => {
      const { result } = mount()
      await act(async () => { result.current.add([file('a.jpg')]) })
      await act(async () => { await result.current.send() })

      global.fetch = vi.fn(() => Promise.reject(new Error('blip')))
      await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
      expect(result.current.job.status).toBe('running')
    })

    it('puts the panel away when asked', async () => {
      const { result } = mount()
      await act(async () => { result.current.add([file('a.jpg')]) })
      await act(async () => { await result.current.send() })
      await act(async () => { result.current.clearJob() })
      expect(result.current.job).toBeNull()
    })
  })
})

import { describe, it, expect, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useRestoreFlow } from '../../../src/lib/useRestoreFlow'

const ITEM = { path: 'archive/1951/x.jpg' }
const PREVIEW = { preview: '__restore/x.png', width: 900, height: 700 }

function setup(over = {}) {
  const handlers = {
    item: ITEM,
    onRestorePreview: vi.fn().mockResolvedValue(PREVIEW),
    onRestoreDiscard: vi.fn().mockResolvedValue(undefined),
    onRestoreApply: vi.fn().mockResolvedValue(undefined),
    onDone: vi.fn(),
    ...over,
  }
  return { ...handlers, ...renderHook(() => useRestoreFlow(handlers)) }
}

describe('useRestoreFlow', () => {
  describe('making a preview', () => {
    it('holds the result rather than writing anything', async () => {
      const s = setup()
      await act(async () => { await s.result.current.start() })
      expect(s.result.current.result).toEqual(PREVIEW)
      expect(s.onRestoreApply).not.toHaveBeenCalled()
    })

    it('clears any previous complaint when trying again', async () => {
      const onRestorePreview = vi.fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce(PREVIEW)
      const s = setup({ onRestorePreview })
      await act(async () => { await s.result.current.start() })
      expect(s.result.current.error).toBeTruthy()
      await act(async () => { await s.result.current.start() })
      expect(s.result.current.error).toBeNull()
      expect(s.result.current.result).toEqual(PREVIEW)
    })
  })

  describe('when the restoration fails', () => {
    // The pipeline's own words, tidied where they are known to be cryptic.
    it('explains an out-of-memory in terms of what to do about it', async () => {
      const s = setup({ onRestorePreview: vi.fn().mockRejectedValue(new Error('CUDA out of memory')) })
      await act(async () => { await s.result.current.start() })
      expect(s.result.current.error).toMatch(/graphics card ran out of memory/)
      expect(s.result.current.error).toMatch(/Ollama/)
    })

    it('explains an empty result the same way', async () => {
      const s = setup({ onRestorePreview: vi.fn().mockRejectedValue(new Error('no output file')) })
      await act(async () => { await s.result.current.start() })
      expect(s.result.current.error).toMatch(/produced nothing/)
    })

    it('passes anything else along as it came', async () => {
      const s = setup({ onRestorePreview: vi.fn().mockRejectedValue(new Error('script not found')) })
      await act(async () => { await s.result.current.start() })
      expect(s.result.current.error).toBe('script not found')
    })

    it('says something when the failure carries no words at all', async () => {
      const s = setup({ onRestorePreview: vi.fn().mockRejectedValue(new Error()) })
      await act(async () => { await s.result.current.start() })
      expect(s.result.current.error).toBe('The restoration failed.')
    })

    it('leaves no half-preview behind', async () => {
      const s = setup({ onRestorePreview: vi.fn().mockRejectedValue(new Error('x')) })
      await act(async () => { await s.result.current.start() })
      expect(s.result.current.result).toBeNull()
      expect(s.result.current.busy).toBe(false)
    })

    it('can be dismissed', async () => {
      const s = setup({ onRestorePreview: vi.fn().mockRejectedValue(new Error('x')) })
      await act(async () => { await s.result.current.start() })
      await act(async () => { s.result.current.dismissError() })
      expect(s.result.current.error).toBeNull()
    })
  })

  describe('throwing the preview away', () => {
    // The original was never touched, so there is nothing to undo.
    it('drops it and tells the server to clean up', async () => {
      const s = setup()
      await act(async () => { await s.result.current.start() })
      await act(async () => { await s.result.current.discard() })
      expect(s.result.current.result).toBeNull()
      expect(s.onRestoreDiscard).toHaveBeenCalledWith(ITEM)
    })

    it('copes when there is nothing to clean up on the server', async () => {
      const s = setup({ onRestoreDiscard: undefined })
      await act(async () => { await s.result.current.start() })
      await act(async () => { await s.result.current.discard() })
      expect(s.result.current.result).toBeNull()
    })
  })

  describe('keeping it', () => {
    it('writes it over the photograph and closes the preview', async () => {
      const s = setup()
      await act(async () => { await s.result.current.start() })
      await act(async () => { await s.result.current.keep() })
      expect(s.onRestoreApply).toHaveBeenCalledWith(ITEM)
      expect(s.result.current.result).toBeNull()
      expect(s.onDone).toHaveBeenCalled()
    })

    it('keeps the preview when writing it fails', async () => {
      const s = setup({ onRestoreApply: vi.fn().mockRejectedValue(new Error('read-only')) })
      await act(async () => { await s.result.current.start() })
      await act(async () => {
        await expect(s.result.current.keep()).rejects.toThrow('read-only')
      })
      expect(s.result.current.result).toEqual(PREVIEW)
      expect(s.result.current.busy).toBe(false)
    })

    it('copes when nobody is listening for the finish', async () => {
      const s = setup({ onDone: undefined })
      await act(async () => { await s.result.current.start() })
      await act(async () => { await s.result.current.keep() })
      expect(s.result.current.result).toBeNull()
    })
  })
})

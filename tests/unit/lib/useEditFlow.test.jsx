import { describe, it, expect, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useEditFlow } from '../../../src/lib/useEditFlow'

const ITEM = { path: 'archive/2026/x.jpg' }

describe('useEditFlow', () => {
  describe('the panel', () => {
    it('starts closed', () => {
      const { result } = renderHook(() => useEditFlow(vi.fn(), ITEM))
      expect(result.current.open_).toBe(false)
    })

    it('opens and closes on request', async () => {
      const { result } = renderHook(() => useEditFlow(vi.fn(), ITEM))
      await act(async () => { result.current.open() })
      expect(result.current.open_).toBe(true)
      await act(async () => { result.current.close() })
      expect(result.current.open_).toBe(false)
    })
  })

  describe('applying the edit', () => {
    it('hands the photograph and the settings to the save', async () => {
      const save = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() => useEditFlow(save, ITEM))
      await act(async () => { await result.current.apply({ shadows: 0.2 }) })
      expect(save).toHaveBeenCalledWith(ITEM, { shadows: 0.2 })
    })

    it('closes once it has worked', async () => {
      const { result } = renderHook(() => useEditFlow(vi.fn().mockResolvedValue(undefined), ITEM))
      await act(async () => { result.current.open() })
      await act(async () => { await result.current.apply({}) })
      expect(result.current.open_).toBe(false)
    })

    // Closing it would throw away the settings somebody has just spent a
    // minute choosing.
    it('stays open when the save fails', async () => {
      const save = vi.fn().mockRejectedValue(new Error('refused'))
      const { result } = renderHook(() => useEditFlow(save, ITEM))
      await act(async () => { result.current.open() })
      await act(async () => {
        await expect(result.current.apply({})).rejects.toThrow('refused')
      })
      expect(result.current.open_).toBe(true)
      expect(result.current.busy).toBe(false)
    })
  })
})

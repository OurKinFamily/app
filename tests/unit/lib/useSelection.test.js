import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useSelection } from '../../../src/lib/useSelection'

const items = [{ path: 'a' }, { path: 'b' }, { path: 'c' }, { path: 'd' }]

describe('useSelection', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useSelection())
    expect(result.current.count).toBe(0)
    expect(result.current.selectedPaths).toEqual([])
  })

  it('toggles a single item on and off', () => {
    const { result } = renderHook(() => useSelection())
    act(() => result.current.toggle(items[1], 1, false, items))
    expect(result.current.selectedPaths).toEqual(['b'])
    expect(result.current.count).toBe(1)
    act(() => result.current.toggle(items[1], 1, false, items))
    expect(result.current.selectedPaths).toEqual([])
  })

  it('shift-click selects the contiguous range from the anchor', () => {
    const { result } = renderHook(() => useSelection())
    act(() => result.current.toggle(items[0], 0, false, items))   // anchor at 0
    act(() => result.current.toggle(items[2], 2, true, items))    // shift to 2
    expect(result.current.selectedPaths.sort()).toEqual(['a', 'b', 'c'])
  })

  it('shift range works regardless of click direction (high → low)', () => {
    const { result } = renderHook(() => useSelection())
    act(() => result.current.toggle(items[3], 3, false, items))   // anchor at 3
    act(() => result.current.toggle(items[1], 1, true, items))    // shift back to 1
    expect(result.current.selectedPaths.sort()).toEqual(['b', 'c', 'd'])
  })

  it('shift with no prior anchor behaves like a single toggle', () => {
    const { result } = renderHook(() => useSelection())
    act(() => result.current.toggle(items[2], 2, true, items))
    expect(result.current.selectedPaths).toEqual(['c'])
  })

  it('shift falls back to single toggle when no ordered list is given', () => {
    const { result } = renderHook(() => useSelection())
    act(() => result.current.toggle(items[0], 0, false, items))
    act(() => result.current.toggle(items[2], 2, true, undefined))
    expect(result.current.selectedPaths.sort()).toEqual(['a', 'c'])
  })

  it('skips holes in the ordered list during a range select', () => {
    const sparse = [{ path: 'a' }, undefined, { path: 'c' }]
    const { result } = renderHook(() => useSelection())
    act(() => result.current.toggle(sparse[0], 0, false, sparse))
    act(() => result.current.toggle(sparse[2], 2, true, sparse))
    expect(result.current.selectedPaths.sort()).toEqual(['a', 'c'])
  })

  it('clear() empties the selection and resets the anchor', () => {
    const { result } = renderHook(() => useSelection())
    act(() => result.current.toggle(items[0], 0, false, items))
    act(() => result.current.clear())
    expect(result.current.count).toBe(0)
    // anchor reset: a subsequent shift-click acts as a single toggle
    act(() => result.current.toggle(items[2], 2, true, items))
    expect(result.current.selectedPaths).toEqual(['c'])
  })
})

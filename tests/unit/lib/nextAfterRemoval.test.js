import { describe, it, expect } from 'vitest'
import { nextAfterRemoval } from '../../../src/lib/nextAfterRemoval'

const list = ['a', 'b', 'c', 'd'].map(path => ({ path }))

/**
 * Deleting from the lightbox used to close it and drop you back in the grid.
 * The thing people actually do here is work through a run of near-duplicates
 * and throw out the bad ones, and closing after each one means finding your
 * place again every time.
 */
describe('what to show once a photograph is deleted', () => {
  it('goes forward', () => {
    expect(nextAfterRemoval(list, 'b')?.path).toBe('c')
  })

  it('goes back when there is nothing ahead', () => {
    // Deleting the last one should leave you on the new last one, not throw
    // you out of the set.
    expect(nextAfterRemoval(list, 'd')?.path).toBe('c')
  })

  it('skips over photographs already deleted this session', () => {
    // The gallery hides deleted tiles rather than splicing them out, so a run
    // of deletes would otherwise land on one that is no longer there.
    expect(nextAfterRemoval(list, 'a', new Set(['b', 'c']))?.path).toBe('d')
  })

  it('skips backward over them too', () => {
    expect(nextAfterRemoval(list, 'd', new Set(['b', 'c']))?.path).toBe('a')
  })

  it('says there is nowhere to go when that was the only one', () => {
    expect(nextAfterRemoval([{ path: 'a' }], 'a')).toBeNull()
  })

  it('says there is nowhere to go when everything else is gone', () => {
    expect(nextAfterRemoval(list, 'b', new Set(['a', 'c', 'd']))).toBeNull()
  })

  it('says nothing about a photograph that is not in the list', () => {
    // Reached by its URL rather than by paging — the gallery stands one up
    // without it being in the loaded set.
    expect(nextAfterRemoval(list, 'zzz')).toBeNull()
  })

  it('copes with no list at all', () => {
    expect(nextAfterRemoval(null, 'a')).toBeNull()
    expect(nextAfterRemoval(undefined, 'a')).toBeNull()
    expect(nextAfterRemoval([], 'a')).toBeNull()
  })

  it('steps over a hole in the list', () => {
    expect(nextAfterRemoval([{ path: 'a' }, null, { path: 'c' }], 'a')?.path).toBe('c')
  })
})

import { useCallback, useState } from 'react'

/**
 * Doing one thing to many photographs.
 *
 * Every endpoint here takes a single path — favouriting, deleting and redating
 * were all written for one photograph at a time — so this fans out and waits.
 * Fired together rather than in sequence: forty round trips one after another
 * is a visible pause for something the reader thinks of as a single act.
 *
 * `busy` is the name of what is running, so a bar can say "Deleting…" rather
 * than going quiet and hoping.
 */
export function useBulkActions({ paths, onDone }) {
  const [busy, setBusy] = useState(null)

  const run = useCallback(async (name, fn) => {
    if (!paths.length) return
    setBusy(name)
    try {
      const results = await Promise.allSettled(paths.map(fn))
      const failed = results.filter(r => r.status === 'rejected').length
      // Reload regardless: a partial success still changed things, and leaving
      // the page showing the old state is worse than saying nothing.
      onDone?.({ name, failed, total: paths.length })
    } finally {
      setBusy(null)
    }
  }, [paths, onDone])

  const favourite = useCallback(() => run('favourite', path =>
    fetch(`/api/me/favorites?path=${encodeURIComponent(path)}`, { method: 'PUT' }),
  ), [run])

  const unfavourite = useCallback(() => run('unfavourite', path =>
    fetch(`/api/me/favorites?path=${encodeURIComponent(path)}`, { method: 'DELETE' }),
  ), [run])

  const redate = useCallback(patch => run('redate', path =>
    fetch(`/api/gallery/media?path=${encodeURIComponent(path)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }),
  ), [run])

  const remove = useCallback(() => run('delete', path =>
    fetch(`/api/gallery/media?path=${encodeURIComponent(path)}`, { method: 'DELETE' }),
  ), [run])

  return { busy, favourite, unfavourite, redate, remove }
}

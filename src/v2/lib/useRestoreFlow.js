import { useCallback, useState } from 'react'

/**
 * Run the restoration, look at it, then decide.
 *
 * The middle step is the point. A restoration is a machine's opinion about
 * what a photograph used to look like — usually a good one, and "usually" is
 * why nothing is written until somebody says so.
 *
 * Discarding costs only the fifteen seconds it took: the original was never
 * touched, so there is nothing to undo.
 */
export function useRestoreFlow({
  item, onRestorePreview, onRestoreDiscard, onRestoreApply, onDone,
}) {
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const start = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      setResult(await onRestorePreview(item))
    } catch (e) {
      setResult(null)
      setError(readable(e.message))
    } finally {
      setBusy(false)
    }
  }, [item, onRestorePreview])

  const dismissError = useCallback(() => setError(null), [])

  const discard = useCallback(async () => {
    setResult(null)
    await onRestoreDiscard?.(item)
  }, [item, onRestoreDiscard])

  const keep = useCallback(async () => {
    setBusy(true)
    try {
      await onRestoreApply(item)
      setResult(null)
      onDone?.()
    } finally {
      setBusy(false)
    }
  }, [item, onRestoreApply, onDone])

  return { result, busy, error, start, discard, keep, dismissError }
}

/** The pipeline's own words, tidied where they are known to be cryptic. */
function readable(message = '') {
  if (/out of memory/i.test(message)) {
    return 'The graphics card ran out of memory. Large photographs need most '
      + 'of it, so close anything else using the GPU (Ollama holds several '
      + 'gigabytes while a model is loaded) and try again.'
  }
  if (/no output file/i.test(message)) {
    return 'The restoration pipeline produced nothing. It usually means it ran '
      + 'out of memory part-way through.'
  }
  return message || 'The restoration failed.'
}

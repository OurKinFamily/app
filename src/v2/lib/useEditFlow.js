import { useCallback, useState } from 'react'

/**
 * Open an editor, wait for it, close it — but only if it worked.
 *
 * The shape every edit-with-a-preview wants: the panel stays put when the save
 * fails, because closing it would throw away the settings somebody has just
 * spent a minute choosing.
 */
export function useEditFlow(save, item) {
  const [open_, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const apply = useCallback(async values => {
    setBusy(true)
    try {
      await save(item, values)
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }, [save, item])

  return {
    open_, busy, apply,
    open: useCallback(() => setOpen(true), []),
    close: useCallback(() => setOpen(false), []),
  }
}

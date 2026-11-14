import { useEffect } from 'react'
import { useToast } from './Toast'
import { onApiError } from '../lib/apiErrors'

/**
 * Turns API failures into toasts.
 *
 * Renders nothing. It exists because the reporter in lib/apiErrors wraps
 * `fetch` at module load — long before React, and with no way to reach a
 * context from there — so something inside `ToastProvider` has to listen on
 * its behalf. Mounted once, in App.
 */

// Toasts default to three seconds, which suits "Saved" — you already know what
// you did, and the toast only confirms it. An API failure is the opposite: it
// is the first you have heard of it, the sentence names a thing you did not do,
// and three seconds was not enough to read it before it vanished. The symptom
// reported was "I keep seeing 'couldn't load people', the toast goes away
// quickly" — which is a bug report you cannot act on, because the part that
// says what broke disappears before you can read it.
const ERROR_DURATION = 9000

export function ApiErrorToasts() {
  const { toast } = useToast()
  useEffect(
    () => onApiError(message => toast.error(message, { duration: ERROR_DURATION })),
    [toast],
  )
  return null
}

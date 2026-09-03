import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '../lib/cn'

// Solid, not tinted glass. A toast says what just happened and then leaves;
// a translucent one over a wall of photographs is a smear that has to be
// deciphered before it disappears — the one piece of the interface that
// cannot afford to be pretty at the cost of legible.
const TONE_STYLES = {
  success: 'border-green-800  bg-green-700  text-white',
  error:   'border-red-800    bg-red-700    text-white',
  info:    'border-zinc-800   bg-zinc-900   text-white',
  warning: 'border-amber-700  bg-amber-600  text-white',
}

const TONE_ICON = {
  success: CheckCircle2,
  error:   AlertCircle,
  info:    Info,
  warning: AlertTriangle,
}

const DEFAULT_DURATION = 3000

const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const push = useCallback((message, opts = {}) => {
    const id = ++idRef.current
    const t = {
      id,
      message,
      tone: opts.tone || 'info',
      duration: opts.duration ?? DEFAULT_DURATION,
    }
    setToasts(prev => [...prev, t])
    if (t.duration > 0) {
      setTimeout(() => remove(id), t.duration)
    }
    return id
  }, [remove])

  const api = {
    toast: Object.assign(
      (message, opts) => push(message, opts),
      {
        success: (message, opts) => push(message, { ...opts, tone: 'success' }),
        error:   (message, opts) => push(message, { ...opts, tone: 'error' }),
        info:    (message, opts) => push(message, { ...opts, tone: 'info' }),
        warning: (message, opts) => push(message, { ...opts, tone: 'warning' }),
        dismiss: remove,
      }
    ),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 left-4 z-[2000] flex w-[min(90vw,360px)] flex-col gap-2"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map(t => <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />)}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onClose }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    // Trigger enter transition on next frame
    const r = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(r)
  }, [])

  const Icon = TONE_ICON[toast.tone] || Info
  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex items-start gap-2 rounded-lg border px-3.5 py-2.5 text-[13px] font-medium shadow-xl transition-all duration-150',
        TONE_STYLES[toast.tone] || TONE_STYLES.info,
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
      )}
    >
      <Icon size={16} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 break-words leading-snug">{toast.message}</div>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        className="shrink-0 rounded p-0.5 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
      >
        <X size={14} />
      </button>
    </div>
  )
}

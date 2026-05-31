import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '../lib/cn'

const TONE_STYLES = {
  success: 'border-green-500/35 bg-green-500/15 text-green-300',
  error:   'border-red-500/35   bg-red-500/15   text-red-300',
  info:    'border-blue-500/35  bg-blue-500/15  text-blue-300',
  warning: 'border-amber-500/35 bg-amber-500/15 text-amber-300',
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
        className="pointer-events-none fixed bottom-4 right-4 z-[2000] flex w-[min(90vw,360px)] flex-col gap-2"
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
        'pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[13px] shadow-lg backdrop-blur-md transition-all duration-150',
        TONE_STYLES[toast.tone] || TONE_STYLES.info,
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
      )}
    >
      <Icon size={16} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 break-words leading-snug">{toast.message}</div>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        className="shrink-0 rounded p-0.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X size={14} />
      </button>
    </div>
  )
}

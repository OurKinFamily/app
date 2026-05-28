import { useState } from 'react'
import { X, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal } from 'lucide-react'
import { setCover } from '../lib/api'
import { Button } from './Button'
import { cn } from '../lib/cn'

const POSITIONS = [
  { value: 'top',    label: 'Top',    Icon: AlignStartHorizontal },
  { value: 'center', label: 'Center', Icon: AlignCenterHorizontal },
  { value: 'bottom', label: 'Bottom', Icon: AlignEndHorizontal },
]

// Cover-image alignment picker for a Person. The actual image-picking
// happens in the lightbox via the "Set as cover" action; this dialog only
// adjusts vertical alignment (top / center / bottom) and lets the user clear
// the cover entirely (fall back to a random photo).
export function CoverPicker({ person, onClose, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [position, setPosition] = useState(person.cover_position || 'center')

  async function save() {
    setSaving(true)
    try {
      await setCover(person.id, person.cover_image || null, position)
      onSaved({ cover_image: person.cover_image || null, cover_position: position })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function clear() {
    setSaving(true)
    try {
      await setCover(person.id, null, null)
      onSaved({ cover_image: null, cover_position: null })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/75 p-4" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm overflow-hidden rounded-xl border border-white/10 bg-zinc-950"
      >
        <div className="flex items-center gap-3 border-b border-white/10 p-3">
          <h2 className="flex-1 text-sm font-medium text-white/85">Cover alignment</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <p className="text-[12px] text-white/40">
            Pick a cover photo from any image in the lightbox via the &ldquo;Set as cover&rdquo; action. This dialog adjusts vertical crop only.
          </p>
          <div className="flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
            {POSITIONS.map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => setPosition(value)}
                aria-label={`Align ${label}`}
                title={`Align ${label}`}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[12px] transition-colors',
                  position === value ? 'bg-white/15 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white/80',
                )}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2">
            {person.cover_image && (
              <Button size="sm" variant="secondary" onClick={clear} disabled={saving}>
                Clear (use random)
              </Button>
            )}
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

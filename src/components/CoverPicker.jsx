import { useState } from 'react'
import { AlignCenterHorizontal, AlignEndHorizontal, AlignStartHorizontal, Frame } from 'lucide-react'
import { setCover } from '../lib/api'
import { Modal } from '../v2/ui/Modal'
import { Choices } from '../v2/ui/Field'
import { modalButton } from '../v2/lib/modalButton'
import { C } from '../v2/ui/tokens'

/**
 * How somebody's cover photograph sits in the banner.
 *
 * Which photograph it is gets chosen from the photograph itself — "Set as
 * cover" in the lightbox. This only decides how it fills the space, which
 * matters more than it sounds: a banner crop set to centre will take the head
 * off a tall portrait, and "Whole photo" is the default for that reason.
 */
const POSITIONS = [
  { value: 'fit', label: 'Whole photo', icon: <Frame size={14} />, title: 'Show all of it, over a blurred copy' },
  { value: 'top', label: 'Top', icon: <AlignStartHorizontal size={14} /> },
  { value: 'center', label: 'Middle', icon: <AlignCenterHorizontal size={14} /> },
  { value: 'bottom', label: 'Bottom', icon: <AlignEndHorizontal size={14} /> },
]

export function CoverPicker({ person, onClose, onSaved }) {
  const [position, setPosition] = useState(person.cover_position || 'fit')
  const [saving, setSaving] = useState(false)

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
    <Modal
      title="Cover photo"
      onClose={onClose}
      width={420}
      footer={
        <>
          {person.cover_image && (
            <button type="button" onClick={clear} disabled={saving} style={modalButton(false, saving)}>
              Use any photo
            </button>
          )}
          <button type="button" onClick={save} disabled={saving} style={modalButton(true, saving)}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <p style={{ fontSize: 12.5, color: C.muted, margin: '0 0 12px', lineHeight: 1.5 }}>
        Choose which photograph from any picture of them — “Set as cover” when it is open.
        This is how it sits in the banner.
      </p>

      <Choices options={POSITIONS} value={position} onChange={setPosition} />
    </Modal>
  )
}

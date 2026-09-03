import { useState } from 'react'
import { createPerson } from '../lib/api'
import { Modal } from '../v2/ui/Modal'
import { Field, Note } from '../v2/ui/Field'
import { modalButton } from '../v2/lib/modalButton'

/**
 * Somebody new.
 *
 * A name is all that is required. Everything else about a person in this
 * archive gets filled in over years, out of photographs and letters and other
 * people's memories, and a form that insists on dates up front is a form that
 * stops somebody adding a great-aunt they have just found.
 */
export function AddPersonModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [knownAs, setKnownAs] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function submit() {
    if (!name.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      onCreated(await createPerson({
        name: name.trim(),
        known_as: knownAs.trim() || null,
        birth_date: birthYear.trim() || null,
        birth_date_precision: birthYear.trim() ? 'year' : null,
      }))
    } catch {
      setError('That did not save. Try again?')
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Add somebody"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} style={modalButton(false)}>Cancel</button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || !name.trim()}
            style={modalButton(true, saving || !name.trim())}
          >
            {saving ? 'Adding…' : 'Add them'}
          </button>
        </>
      }
    >
      {error && <Note tone="bad">{error}</Note>}

      <Field
        label="Their name"
        autoFocus
        value={name}
        onChange={setName}
        onEnter={submit}
        placeholder="Margaret Young"
      />
      <Field
        label="Known as"
        optional
        value={knownAs}
        onChange={setKnownAs}
        onEnter={submit}
        placeholder="Grandma Young"
      />
      <Field
        label="Born"
        optional
        value={birthYear}
        onChange={setBirthYear}
        onEnter={submit}
        placeholder="1942"
      />
    </Modal>
  )
}

import { useState } from 'react'
import { Modal } from './Modal'
import { modalButton } from '../lib/modalButton'
import { TYPE_LABELS } from '../lib/circleTypes'
import { C } from './tokens'

/**
 * Making a group.
 *
 * The type is required and chosen from the list rather than typed, because
 * every group already in the archive uses one of these fourteen and a
 * fifteenth spelling would quietly split a category in two.
 */
export function NewGroupDialog({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', type: 'school', year: '', description: '', location_name: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/groups/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          year: form.year ? parseInt(form.year, 10) : null,
          description: form.description.trim() || null,
          location_name: form.location_name.trim() || null,
        }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const group = await res.json()
      onCreated?.(group.id)
    } catch {
      setError('Could not create the group. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="New group"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} style={modalButton(false)}>
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || !form.name.trim()}
            style={modalButton(true, saving || !form.name.trim())}
          >
            {saving ? 'Creating…' : 'Create'}
          </button>
        </>
      }
    >
      <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <Field label="Name" required>
          <input
            autoFocus
            value={form.name}
            onChange={set('name')}
            placeholder="e.g. Timberlane Regional"
            style={field}
          />
        </Field>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 110px' }}>
          <Field label="Kind">
            <select value={form.type} onChange={set('type')} style={field}>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Year">
            <input
              value={form.year}
              onChange={set('year')}
              placeholder="1994"
              inputMode="numeric"
              style={field}
            />
          </Field>
        </div>

        <Field label="Where">
          <input
            value={form.location_name}
            onChange={set('location_name')}
            placeholder="Optional"
            style={field}
          />
        </Field>

        <Field label="Notes">
          <input
            value={form.description}
            onChange={set('description')}
            placeholder="Optional"
            style={field}
          />
        </Field>

        {error && <p style={{ color: '#c5221f', fontSize: 12.5, margin: 0 }}>{error}</p>}
      </form>
    </Modal>
  )
}

function Field({ label, required, children }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 11.5, color: C.muted, marginBottom: 3 }}>
        {label}{required ? ' *' : ''}
      </span>
      {children}
    </label>
  )
}

const field = {
  width: '100%', boxSizing: 'border-box', height: 34, padding: '0 10px',
  border: `1px solid ${C.border}`, borderRadius: 8,
  font: 'inherit', fontSize: 13, color: C.text, background: C.bg,
}

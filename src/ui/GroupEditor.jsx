import { useState } from 'react'
import { Modal } from './Modal'
import { Field } from './Field'
import { PlacePicker } from './PlacePicker'
import { modalButton } from '../lib/modalButton'
import { TYPE_LABELS } from '../lib/circleTypes'
import { C } from './tokens'

/** Changing what a circle is, when it was, and where. */
export function GroupEditor({ group, onSave, onClose }) {
  const [form, setForm] = useState({
    name: group.name,
    type: group.type,
    year: group.year || '',
    season: group.season || '',
    notes: group.notes || '',
    location: group.latitude
      ? { name: group.location_name, lat: group.latitude, lng: group.longitude }
      : null,
  })
  const [saving, setSaving] = useState(false)
  const set = patch => setForm(f => ({ ...f, ...patch }))

  async function save() {
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Edit this circle"
      onClose={onClose}
      width={470}
      footer={
        <>
          <button type="button" onClick={onClose} style={modalButton(false)}>Cancel</button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !form.name.trim()}
            style={modalButton(true, saving || !form.name.trim())}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <Field label="What it is called" value={form.name} onChange={name => set({ name })} />

      <label style={{ display: 'block', marginBottom: 12 }}>
        <span style={{ display: 'block', fontSize: 11.5, color: C.muted, marginBottom: 4 }}>
          What kind
        </span>
        <select value={form.type} onChange={e => set({ type: e.target.value })} style={select}>
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </label>

      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
        <Field label="Year" optional value={form.year} onChange={year => set({ year })} placeholder="1978" />
        <Field label="Season" optional value={form.season} onChange={season => set({ season })} placeholder="Autumn" />
      </div>

      <div style={{ marginBottom: 12 }}>
        <span style={{ display: 'block', fontSize: 11.5, color: C.muted, marginBottom: 4 }}>
          Where <span>optional</span>
        </span>
        <PlacePicker value={form.location} onChange={location => set({ location })} />
      </div>

      <label style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: 11.5, color: C.muted, marginBottom: 4 }}>
          Anything worth remembering <span>optional</span>
        </span>
        <textarea
          rows={3}
          value={form.notes}
          onChange={e => set({ notes: e.target.value })}
          style={{ ...select, height: 'auto', padding: '8px 11px', resize: 'vertical' }}
        />
      </label>
    </Modal>
  )
}

const select = {
  width: '100%', boxSizing: 'border-box', height: 34, padding: '0 10px',
  border: `1px solid ${C.border}`, borderRadius: 9,
  font: 'inherit', fontSize: 13, color: C.text, background: C.bg,
}

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { C } from './tokens'
import { formatDate } from '../lib/formatDate'

/**
 * What is known about a person, and the form for changing it.
 *
 * The labels are the family-facing ones the archive has settled on — Passed,
 * Last home, Laid to rest, Arrived, Became citizen. Somebody's granddaughter
 * reads this page; "death_place" is for the database.
 *
 * Empty fields are omitted rather than shown blank. A page of "—" reads as a
 * form nobody filled in; what is there should look deliberate.
 */

const FIELDS = [
  ['death_date', 'Passed', true],
  ['death_place', 'Last home'],
  ['burial_place', 'Laid to rest'],
  ['immigration_date', 'Arrived', 'year'],
  ['immigration_place', 'From / via'],
  ['naturalization_date', 'Became citizen', 'year'],
  ['naturalization_place', 'Took citizenship in'],
]

export function PersonFacts({ person, relationship, canEdit, onEdit }) {
  const shown = FIELDS
    .map(([key, label, date]) => [label, date ? formatDate(person[key], date === 'year' ? 'year' : person.death_date_precision) : person[key]])
    .filter(([, value]) => value)

  const alsoKnown = person.former_names?.length ? person.former_names.join(' · ') : null

  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0, maxWidth: '62ch' }}>
          {relationship && (
            <p style={{
              fontSize: 14, color: C.text, margin: '0 0 10px',
              textTransform: 'capitalize',
            }}>
              {relationship}
            </p>
          )}

          {alsoKnown && (
            <p style={{ fontSize: 12.5, color: C.muted, margin: '0 0 10px' }}>
              Also known as {alsoKnown}
            </p>
          )}

          {shown.length > 0 && (
            <dl style={{
              display: 'grid', gap: '10px 24px', margin: 0,
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            }}>
              {shown.map(([label, value]) => (
                <div key={label}>
                  <dt style={{ fontSize: 11.5, color: C.muted }}>{label}</dt>
                  <dd style={{ fontSize: 13.5, color: C.text, margin: '2px 0 0' }}>{value}</dd>
                </div>
              ))}
            </dl>
          )}

          {person.notes && (
            <p style={{
              fontSize: 13.5, color: C.text, margin: '14px 0 0', lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
            }}>
              {person.notes}
            </p>
          )}

          {!relationship && !shown.length && !person.notes && (
            <p style={{ fontSize: 13.5, color: C.muted, margin: 0 }}>
              Nothing recorded about {person.known_as || person.name} yet.
            </p>
          )}
        </div>

        {canEdit && (
          <button type="button" onClick={onEdit} style={pill}>
            <Pencil size={14} /> Edit
          </button>
        )}
      </div>
    </section>
  )
}

export function PersonFactsForm({ person, onSaved, onCancel }) {
  const [form, setForm] = useState(() => ({
    name: person.name || '', known_as: person.known_as || '',
    maiden_name: person.maiden_name || '',
    birth_date: person.birth_date || '',
    birth_date_precision: person.birth_date_precision || 'full',
    birth_place: person.birth_place || '',
    death_date: person.death_date || '',
    death_date_precision: person.death_date_precision || 'full',
    death_place: person.death_place || '', burial_place: person.burial_place || '',
    immigration_date: person.immigration_date || '',
    immigration_place: person.immigration_place || '',
    naturalization_date: person.naturalization_date || '',
    naturalization_place: person.naturalization_place || '',
    notes: person.notes || '',
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = key => e => setForm(p => ({ ...p, [key]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      // Blank means "not known", which the graph stores as null rather than an
      // empty string — otherwise every unset field starts matching searches
      // for the empty value.
      const body = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === '' ? null : v]),
      )
      const res = await fetch(`/api/people/${person.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, name: form.name }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      onSaved(await res.json())
    } catch {
      setError('Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 640, marginBottom: 28 }}>
      <div style={grid}>
        <Field label="Full name" required {...bind(form, set, 'name')} />
        <Field label="Known as" placeholder="Nickname" {...bind(form, set, 'known_as')} />
        <Field label="Maiden name" {...bind(form, set, 'maiden_name')} />
        <div />
        <Field label="Born" placeholder="YYYY or YYYY-MM-DD" {...bind(form, set, 'birth_date')} />
        <Precision
          label="Born, how precisely"
          value={form.birth_date_precision}
          onChange={set('birth_date_precision')}
        />
        <Field label="Birthplace" {...bind(form, set, 'birth_place')} />
        <div />
        <Field label="Passed" placeholder="YYYY or YYYY-MM-DD" {...bind(form, set, 'death_date')} />
        <Precision
          label="Passed, how precisely"
          value={form.death_date_precision}
          onChange={set('death_date_precision')}
        />
        <Field label="Last home" {...bind(form, set, 'death_place')} />
        <Field label="Laid to rest" {...bind(form, set, 'burial_place')} />
        <Field label="Arrived" placeholder="YYYY" {...bind(form, set, 'immigration_date')} />
        <Field label="From / via" {...bind(form, set, 'immigration_place')} />
        <Field label="Became citizen" placeholder="YYYY" {...bind(form, set, 'naturalization_date')} />
        <Field label="Took citizenship in" {...bind(form, set, 'naturalization_place')} />
      </div>

      <label style={{ display: 'block', marginTop: 12 }}>
        <span style={labelStyle}>Notes</span>
        <textarea
          value={form.notes}
          onChange={set('notes')}
          rows={4}
          style={{ ...input, height: 'auto', padding: '8px 10px', resize: 'vertical' }}
        />
      </label>

      {error && <p style={{ color: '#c5221f', fontSize: 12, margin: '10px 0 0' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button type="submit" disabled={saving || !form.name.trim()} style={primary(saving || !form.name.trim())}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} style={pill}>
          Cancel
        </button>
      </div>
    </form>
  )
}

const bind = (form, set, key) => ({ value: form[key], onChange: set(key) })

function Field({ label, required, ...rest }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={labelStyle}>{label}{required ? ' *' : ''}</span>
      <input required={required} style={input} {...rest} />
    </label>
  )
}

function Precision({ label, value, onChange }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={labelStyle}>{label}</span>
      <select value={value} onChange={onChange} style={input}>
        <option value="full">Exact date</option>
        <option value="year">Year only</option>
      </select>
    </label>
  )
}

const grid = {
  display: 'grid', gap: '12px 16px',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
}
const labelStyle = { display: 'block', fontSize: 11.5, color: C.muted, marginBottom: 3 }
const input = {
  width: '100%', height: 34, padding: '0 10px', boxSizing: 'border-box',
  border: `1px solid ${C.border}`, borderRadius: 8,
  font: 'inherit', fontSize: 13, color: C.text, background: C.bg,
}
const pill = {
  display: 'inline-flex', alignItems: 'center', gap: 7,
  height: 34, padding: '0 14px', borderRadius: 17,
  border: `1px solid ${C.border}`, background: 'transparent',
  color: C.text, fontSize: 13, cursor: 'pointer', flex: '0 0 auto',
}
const primary = disabled => ({
  height: 34, padding: '0 16px', borderRadius: 17, fontSize: 13,
  border: 0, background: C.activeText, color: '#fff',
  opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer',
})

import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Lock, Pencil, Unlock } from 'lucide-react'
import { BiographyProse } from '../ui/BiographyProse'
import { PersonFacts, PersonFactsForm } from '../ui/PersonFacts'
import { hasFacts } from '../lib/personFacts'
import { useIsAdmin } from '../contexts/MeContext'
import { C } from '../ui/tokens'

/**
 * The biography tab.
 *
 * Markdown, written and edited raw. That is deliberate rather than lazy: the
 * text is the archive's most valuable and least reproducible content, and a
 * rich-text editor would silently reshape it. Markdown in a textarea comes
 * back out exactly as it went in, and can be read in fifty years by anything.
 *
 * The life details — also-known-as, Passed, Last home, the notes — sit above
 * the prose here rather than on Overview. They are empty for most people, so
 * the block is skipped entirely when there is nothing in it, and the control
 * that edits it lives in the toolbar instead of inside the block. Otherwise
 * hiding the block would hide the only way to fill it in.
 *
 * Two different edits on one tab, deliberately kept apart: `writing` is the
 * markdown textarea, `editing` (from the outlet) is the details form.
 */
export function PersonBiography() {
  const { person, setPerson, editing, setEditing } = useOutletContext()
  const isAdmin = useIsAdmin()
  const [writing, setWriting] = useState(false)
  const [draft, setDraft] = useState(person.biography || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/people/${person.id}/biography`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ biography: draft }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setPerson(p => ({ ...p, biography: draft }))
      setWriting(false)
    } catch {
      // Never close on a failure: somebody may have just written six
      // paragraphs, and the textarea is the only copy.
      setError('Could not save. Your writing is still here — try again.')
    } finally {
      setSaving(false)
    }
  }

  async function togglePrivate() {
    const next = !person.bio_private
    const res = await fetch(`/api/people/${person.id}/bio-private`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bio_private: next }),
    })
    if (res.ok) setPerson(p => ({ ...p, bio_private: next }))
  }

  if (writing) {
    return (
      <div>
        <p style={{ fontSize: 12.5, color: C.muted, margin: '0 0 8px' }}>
          Markdown. Drop a photograph in with{' '}
          <code style={code}>![caption](archive/bios/&lt;name&gt;/file.jpg)</code>
          {' '}— two or more together become a row.
        </p>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={26}
          placeholder="Write the story…"
          style={{
            width: '100%', boxSizing: 'border-box', padding: 12,
            border: `1px solid ${C.border}`, borderRadius: 10,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 13, lineHeight: 1.6, color: C.text, background: C.bg,
            resize: 'vertical',
          }}
        />
        {error && <p style={{ color: '#c5221f', fontSize: 12.5, margin: '8px 0 0' }}>{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button
            type="button"
            disabled={saving}
            onClick={() => { setDraft(person.biography || ''); setWriting(false) }}
            style={pill}
          >
            Cancel
          </button>
          <button type="button" onClick={save} disabled={saving} style={primary(saving)}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    )
  }

  if (editing) {
    return (
      <PersonFactsForm
        person={person}
        onSaved={updated => { setPerson(updated); setEditing(false) }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  // No page-level width cap. The prose carries its own reading measure, block
  // by block, so the photograph grids inside a biography can use the rest of
  // the page instead of being squeezed into a column of text.
  return (
    <div style={{ position: 'relative' }}>
      {isAdmin && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          {person.bio_private && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '3px 10px', borderRadius: 999,
              background: '#fef7e0', color: '#8a6116', fontSize: 11.5,
            }}>
              <Lock size={11} /> Private — hidden from family
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => setEditing(true)}
            title="Dates, places, other names"
            style={labelled}
          >
            <Pencil size={13} /> Details
          </button>
          <button
            type="button"
            onClick={togglePrivate}
            title={person.bio_private
              ? 'Only you can read this. Click to let family read it.'
              : 'Family can read this. Click to keep it to yourself.'}
            aria-label={person.bio_private ? 'Let family read this' : 'Keep this private'}
            style={ghost}
          >
            {person.bio_private ? <Lock size={15} /> : <Unlock size={15} />}
          </button>
          <button
            type="button"
            onClick={() => { setDraft(person.biography || ''); setWriting(true) }}
            aria-label="Edit biography"
            style={ghost}
          >
            <Pencil size={15} />
          </button>
        </div>
      )}

      {hasFacts(person) && <PersonFacts person={person} />}

      {person.biography
        ? <BiographyProse markdown={person.biography} />
        : (
          <p style={{ color: C.muted, fontSize: 14 }}>
            Nothing written about {person.known_as || (person.name || '').split(' ')[0]} yet.
            {isAdmin && ' The pencil starts a page.'}
          </p>
        )}
    </div>
  )
}

const code = {
  background: C.hover, borderRadius: 4, padding: '1px 5px',
  fontFamily: 'ui-monospace, monospace', fontSize: 11.5,
}
const labelled = {
  display: 'inline-flex', alignItems: 'center', gap: 6, height: 30,
  padding: '0 12px', borderRadius: 15, fontSize: 12.5,
  border: `1px solid ${C.border}`, background: 'transparent',
  color: C.muted, cursor: 'pointer',
}
const ghost = {
  display: 'grid', placeItems: 'center', width: 32, height: 32,
  border: 0, borderRadius: '50%', background: 'transparent',
  color: C.muted, cursor: 'pointer',
}
const pill = {
  height: 34, padding: '0 14px', borderRadius: 17, fontSize: 13,
  border: `1px solid ${C.border}`, background: 'transparent',
  color: C.text, cursor: 'pointer',
}
const primary = busy => ({
  height: 34, padding: '0 16px', borderRadius: 17, fontSize: 13,
  border: 0, background: C.activeText, color: '#fff',
  opacity: busy ? 0.6 : 1, cursor: busy ? 'default' : 'pointer',
})

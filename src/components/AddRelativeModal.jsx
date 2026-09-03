import { useEffect, useRef, useState } from 'react'
import { addRelationship, createPerson, searchPeople } from '../lib/api'
import { Modal } from '../v2/ui/Modal'
import { Choices, Field, Note } from '../v2/ui/Field'
import { modalButton } from '../v2/lib/modalButton'
import { displayName, otherName } from '../lib/people'
import { C } from '../v2/ui/tokens'

/**
 * Joining somebody to the family — either a person already here, or one who is
 * about to be.
 *
 * Siblings are the awkward case: the graph links them through shared parents
 * rather than to each other, so somebody with no parents recorded cannot have
 * a sibling added. That is said plainly up front instead of failing on save.
 */
const LABELS = { spouse: 'a spouse', child: 'a child', sibling: 'a sibling', parent: 'a parent' }

const MODES = [
  { value: 'search', label: 'Already here' },
  { value: 'create', label: 'Somebody new' },
]

export function AddRelativeModal({ action, onClose, onSuccess }) {
  const [mode, setMode] = useState('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [picked, setPicked] = useState(null)
  const [name, setName] = useState('')
  const [knownAs, setKnownAs] = useState('')
  const [born, setBorn] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  // Both parents by default. A child added from one parent's page is almost
  // always the other's too, and unticking is easier than remembering.
  const [alsoParents, setAlsoParents] = useState(
    () => new Set((action.spouses || []).map(s => s.id)),
  )
  const search = useRef(null)

  useEffect(() => { search.current?.focus() }, [mode])

  useEffect(() => {
    const t = setTimeout(() => {
      if (!query.trim()) { setResults([]); return }
      searchPeople(query).then(setResults).catch(() => setResults([]))
    }, query.trim() ? 200 : 0)
    return () => clearTimeout(t)
  }, [query])

  const orphanSibling = action.type === 'sibling' && !action.parentIds?.length
  const ready = mode === 'search' ? !!picked : !!name.trim()

  async function submit() {
    setSaving(true)
    setError(null)
    try {
      const targetId = mode === 'search'
        ? picked.id
        : (await createPerson({
          name: name.trim(),
          known_as: knownAs.trim() || null,
          birth_date: born.trim() || null,
        })).id

      await addRelationship(action.personId, {
        rel_type: action.type,
        target_id: targetId,
        parent_ids: action.parentIds || [],
      })

      if (action.type === 'child') {
        await Promise.all([...alsoParents].map(id =>
          addRelationship(id, { rel_type: 'child', target_id: targetId, parent_ids: [] }),
        ))
      }
      onSuccess()
    } catch {
      setError('That did not save. Try again?')
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Add ${LABELS[action.type]}`}
      onClose={onClose}
      width={460}
      footer={
        <>
          <button type="button" onClick={onClose} style={modalButton(false)}>Cancel</button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || !ready || orphanSibling}
            style={modalButton(true, saving || !ready || orphanSibling)}
          >
            {saving ? 'Saving…' : 'Add them'}
          </button>
        </>
      }
    >
      {orphanSibling && (
        <Note>
          Brothers and sisters are linked through their parents, and this person has none
          recorded yet. Add a parent first and the siblings follow.
        </Note>
      )}
      {error && <Note tone="bad">{error}</Note>}

      <Choices options={MODES} value={mode} onChange={setMode} />

      {mode === 'search' ? (
        <>
          <input
            ref={search}
            value={query}
            onChange={e => { setQuery(e.target.value); setPicked(null) }}
            placeholder="Search by name…"
            style={{
              width: '100%', boxSizing: 'border-box', height: 34, padding: '0 11px',
              border: `1px solid ${C.border}`, borderRadius: 9,
              font: 'inherit', fontSize: 13, color: C.text, background: C.bg,
            }}
          />
          <div style={{ maxHeight: 210, overflowY: 'auto', marginTop: 6 }}>
            {results.map(p => {
              const on = picked?.id === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPicked(p)}
                  style={{
                    display: 'flex', alignItems: 'baseline', gap: 8, width: '100%',
                    padding: '7px 10px', borderRadius: 9, border: 0, font: 'inherit',
                    fontSize: 13, textAlign: 'left', cursor: 'pointer',
                    background: on ? C.activeBg : 'transparent',
                    color: on ? C.activeText : C.text,
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    {displayName(p)}
                    {/* Two people in a family share a first name more often
                        than not, and the nickname is what everybody uses.
                        Both, so the right one can be picked. */}
                    {otherName(p) && (
                      <span style={{ marginLeft: 6, fontSize: 11.5, color: C.muted }}>
                        {otherName(p)}
                      </span>
                    )}
                  </span>
                  {p.birth_date && (
                    <span style={{ fontSize: 11.5, color: C.muted }}>{p.birth_date.slice(0, 4)}</span>
                  )}
                </button>
              )
            })}
            {query.trim() && results.length === 0 && (
              <p style={{ fontSize: 12.5, color: C.muted, textAlign: 'center', padding: '14px 0' }}>
                Nobody by that name yet.
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <Field label="Their name" value={name} onChange={setName} placeholder="Margaret Young" />
          <Field label="Known as" optional value={knownAs} onChange={setKnownAs} placeholder="Grandma Young" />
          <Field label="Born" optional value={born} onChange={setBorn} placeholder="1942, or 1942-06-11" />
        </>
      )}

      {action.type === 'child' && action.spouses?.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 6 }}>Also their child</div>
          {action.spouses.map(spouse => (
            <label
              key={spouse.id}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 13, cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                checked={alsoParents.has(spouse.id)}
                onChange={e => setAlsoParents(prev => {
                  const next = new Set(prev)
                  if (e.target.checked) next.add(spouse.id)
                  else next.delete(spouse.id)
                  return next
                })}
                style={{ width: 15, height: 15, accentColor: C.activeText, cursor: 'pointer' }}
              />
              {displayName(spouse)}
            </label>
          ))}
        </div>
      )}
    </Modal>
  )
}

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { PersonCard } from '../ui/PersonCard'
import { PersonRow, PersonRowHeader } from '../ui/PersonRow'
import { LoadingDots } from '../ui/LoadingDots'
import { PeopleToolbar } from '../ui/PeopleToolbar'
import { personSubtitle } from '../lib/lifespan'
import { displayName } from '../../lib/people'
import { mediaUrl } from '../../lib/media'
import { useIsAdmin } from '../../contexts/MeContext'
import { AddPersonModal } from '../../components/AddPersonModal'
import { C } from '../ui/tokens'

/**
 * Everybody in the archive.
 *
 * 523 people, which is too many to scroll and exactly the number at which
 * search stops being a nicety. The field filters as you type — over a list
 * this size that is faster than any round trip, and it also matches maiden
 * names and nicknames, which is how somebody actually looks for a great-aunt
 * they only ever heard called by one of the two.
 *
 * Sorted by surname, because a family list read any other way is a list of
 * strangers: it puts the Youngs together.
 */

export function V2PeoplePage() {
  const navigate = useNavigate()
  const isAdmin = useIsAdmin()
  const [people, setPeople] = useState(null)
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  // Remembered, because a view is a preference rather than a step: coming back
  // to the list and finding it rearranged is a small, repeated annoyance.
  const [sort, setSort] = useState(() => read('v2.people.sort', 'suggested'))
  const [view, setView] = useState(() => read('v2.people.view', 'grid'))
  useEffect(() => write('v2.people.sort', sort), [sort])
  useEffect(() => write('v2.people.view', view), [view])

  // Typing stays responsive while 523 cards re-filter behind it.
  const deferred = useDeferredValue(query)

  useEffect(() => {
    fetch('/api/people/')
      .then(r => (r.ok ? r.json() : []))
      .then(rows => setPeople(Array.isArray(rows) ? rows : []))
      .catch(() => setPeople([]))
  }, [])

  const sorted = useMemo(() => {
    const rows = people || []
    // "Closest first" is the order the API already returned — the viewer, then
    // kin, then people sharing a surname, each tier by how often they appear.
    // Re-sorting it alphabetically threw all of that away, which is why the
    // family list opened on three unnamed placeholders.
    if (sort === 'suggested') return [...rows].sort(byPlaceholder)
    if (sort === 'born') {
      return [...rows].sort((a, b) => byPlaceholder(a, b)
        || (a.birth_date ? 0 : 1) - (b.birth_date ? 0 : 1)
        || String(a.birth_date || '').localeCompare(String(b.birth_date || ''))
        || displayName(a).localeCompare(displayName(b)))
    }
    return [...rows].sort((a, b) => byPlaceholder(a, b)
      || surname(a).localeCompare(surname(b))
      || displayName(a).localeCompare(displayName(b)))
  }, [people, sort])

  const shown = useMemo(() => {
    const q = deferred.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter(p => [p.name, p.known_as, p.maiden_name, p.former_names]
      .filter(Boolean)
      .some(v => String(v).toLowerCase().includes(q)))
  }, [sorted, deferred])

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        margin: '4px 0 20px', flexWrap: 'wrap',
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, margin: 0 }}>People</h1>
        {people && (
          <span style={{ fontSize: 13, color: C.muted }}>
            {shown.length === sorted.length
              ? sorted.length.toLocaleString()
              : `${shown.length.toLocaleString()} of ${sorted.length.toLocaleString()}`}
          </span>
        )}

        <div style={{ flex: 1 }} />

        <PeopleToolbar
          query={query} onQuery={setQuery}
          sort={sort} onSort={setSort}
          view={view} onView={setView}
        />

        {isAdmin && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              height: 34, padding: '0 14px', borderRadius: 17,
              border: `1px solid ${C.border}`, background: 'transparent',
              color: C.text, fontSize: 13, cursor: 'pointer',
            }}
          >
            <UserPlus size={15} /> Add person
          </button>
        )}
      </div>

      {people === null && <LoadingDots />}

      {people && shown.length === 0 && (
        <p style={{ color: C.muted, fontSize: 14, padding: '48px 0', textAlign: 'center' }}>
          {query ? `Nobody matches “${query}”.` : 'No people yet.'}
        </p>
      )}

      {shown.length > 0 && view === 'grid' && (
        <div style={{
          display: 'grid', gap: 2,
          gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
        }}>
          {shown.map(p => (
            <PersonCard
              key={p.id}
              name={displayName(p)}
              secondary={personSubtitle(p)}
              avatar={p.avatar ? mediaUrl(p.avatar) : null}
              onClick={() => navigate(`/people/${p.id}`)}
            />
          ))}
        </div>
      )}

      {shown.length > 0 && view === 'list' && (
        <div>
          <PersonRowHeader />
          {shown.map(p => (
            <PersonRow
              key={p.id}
              person={p}
              name={displayName(p)}
              secondary={personSubtitle(p)}
              avatar={p.avatar ? mediaUrl(p.avatar) : null}
              onClick={() => navigate(`/people/${p.id}`)}
            />
          ))}
        </div>
      )}

      {adding && (
        <AddPersonModal
          onClose={() => setAdding(false)}
          onCreated={person => navigate(`/people/${person.id}`)}
        />
      )}
    </div>
  )
}

/** Placeholders last in every ordering: three of them, all called
 *  "Unknown person <timestamp>", and by surname that timestamp sorted them
 *  to the very top of the family. */
const byPlaceholder = (a, b) => isPlaceholder(a) - isPlaceholder(b)

const read = (key, fallback) => {
  try { return localStorage.getItem(key) || fallback } catch { return fallback }
}
const write = (key, value) => {
  try { localStorage.setItem(key, value) } catch { /* private window */ }
}

/** A person created by the face pipeline and never named. */
const isPlaceholder = p => (/^Unknown person\b/.test(p.name || '') ? 1 : 0)

/** Last word of the name, so the family sorts together. */
function surname(p) {
  const parts = String(p.name || '').trim().split(/\s+/)
  return parts.length > 1 ? parts[parts.length - 1] : (p.name || '')
}

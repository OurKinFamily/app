import { useCallback, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { FamilyOutline, PillRow } from '../ui/FamilyOutline'
import { useFamilyOutline } from '../lib/useFamilyOutline'
import { LoadingDots } from '../ui/LoadingDots'
import { AddRelativeModal } from '../components/AddRelativeModal'
import { useIsAdmin } from '../contexts/MeContext'
import { C } from '../ui/tokens'

/**
 * A person's family, as a nested outline.
 *
 * Replaces both the box-and-line graph and the two-column split. The split
 * only worked for one generation — above that there are four lines, then
 * eight, and nobody knows offhand which of their great-grandparents is on
 * which side. Nesting says the same thing and keeps saying it: parents sit
 * indented beneath their child, for as far back as the records go, and the
 * indentation IS the lineage so it never needs a label.
 *
 * Three directions from one person: back, alongside, and forward.
 */
export function PersonAncestry() {
  const { person, relatives, reloadRelatives } = useOutletContext()
  const isAdmin = useIsAdmin()
  const [adding, setAdding] = useState(null)
  const outline = useFamilyOutline(person, relatives)

  const remove = useCallback(async (targetId, relType) => {
    if (!relType) return
    await fetch(`/api/people/${person.id}/relationships`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_id: targetId, rel_type: relType }),
    })
    reloadRelatives()
  }, [person.id, reloadRelatives])

  if (!relatives) return <LoadingDots />

  return (
    <div>
      {outline.loading ? <LoadingDots /> : (
        <div style={{ display: 'grid', gap: 22 }}>
          {/* The living family first — the people somebody came here to see —
              and the lineage below, where the depth is. */}
          {outline.spouses.length > 0 && (
            <section>
              <h2 style={heading}>
                {outline.spouses.length === 1 ? 'Spouse' : 'Spouses'}
              </h2>
              <PillRow
                people={outline.spouses}
                canEdit={isAdmin}
                onRemove={p => remove(p.id, p.removableAs)}
              />
            </section>
          )}

          <section>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <h2 style={heading}>Children</h2>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setAdding({
                    type: 'child',
                    personId: person.id,
                    parentIds: relatives?.parents?.map(p => p.id) || [],
                    spouses: relatives?.spouses || [],
                  })}
                  style={addLink}
                >
                  Add
                </button>
              )}
            </div>
            {outline.children.length > 0
              ? (
                <PillRow
                  people={outline.children}
                  canEdit={isAdmin}
                  onRemove={p => remove(p.id, p.removableAs)}
                />
              )
              : <p style={muted}>No children recorded yet.</p>}
          </section>

          {outline.grandchildren.length > 0 && (
            <section>
              <h2 style={heading}>Grandchildren</h2>
              <PillRow people={outline.grandchildren} />
            </section>
          )}

          {outline.siblings.length > 0 && (
            <section>
              <h2 style={heading}>
                {outline.siblings.length === 1 ? 'Sibling' : 'Siblings'}
              </h2>
              <PillRow
                people={outline.siblings}
                canEdit={isAdmin}
                onRemove={p => remove(p.id, p.removableAs)}
              />
            </section>
          )}

          <section>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <h2 style={heading}>Ancestors</h2>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setAdding({
                    type: 'parent', personId: person.id, parentIds: [], spouses: [],
                  })}
                  style={addLink}
                >
                  Add a parent
                </button>
              )}
            </div>
            <FamilyOutline
              root={{ slot: 1 }}
              childrenOf={outline.parentsOf}
              emptyLabel="No parents recorded yet."
              canEdit={isAdmin}
              onAdd={() => setAdding({
                type: 'parent', personId: person.id, parentIds: [], spouses: [],
              })}
              onRemove={p => remove(p.id, p.removableAs)}
            />
          </section>
        </div>
      )}

      {adding && (
        <AddRelativeModal
          action={adding}
          onClose={() => setAdding(null)}
          onSuccess={() => { setAdding(null); reloadRelatives() }}
        />
      )}
    </div>
  )
}

const heading = { fontSize: 15, fontWeight: 500, margin: '0 0 8px' }
const muted = { fontSize: 12.5, color: C.muted, margin: 0 }
const addLink = {
  border: 0, background: 'transparent', color: C.activeText,
  fontSize: 12.5, cursor: 'pointer', padding: 0,
}

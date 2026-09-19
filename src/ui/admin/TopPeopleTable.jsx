import { useMemo, useState } from 'react'
import { sortRows } from '../../lib/useArchiveReport'
import { fmt } from '../../components/admin/format'
import { C } from '../tokens'

/**
 * Who the face pipeline has found the most of.
 *
 * Two columns rather than one, because they mean different things: the gallery
 * count is what somebody has confirmed by hand, the cluster count is what the
 * machine thinks it has found. A large gap either way is the interesting part
 * — plenty of clustered faces and few confirmed means an evening's work is
 * waiting.
 */
const COLUMNS = [
  { key: 'name', label: 'Name', align: 'left' },
  { key: 'gallery_faces', label: 'Confirmed', align: 'right' },
  { key: 'cluster_faces', label: 'Found by the machine', align: 'right' },
  { key: 'total', label: 'Between them', align: 'right', strong: true },
]

export function TopPeopleTable({ people }) {
  const [sort, setSort] = useState({ key: 'total', ascending: false })

  const rows = useMemo(() => {
    const withTotal = (people.top_people || [])
      .map(p => ({ ...p, total: p.gallery_faces + p.cluster_faces }))
    return sortRows(withTotal, sort.key, sort.ascending, (row, key) => row[key] ?? 0)
  }, [people.top_people, sort])

  const toggle = key => setSort(s => (
    s.key === key
      ? { key, ascending: !s.ascending }
      : { key, ascending: key === 'name' }
  ))

  return (
    <div style={{
      maxHeight: 380, overflow: 'auto',
      border: `1px solid ${C.border}`, borderRadius: 10,
    }}>
      <table style={{ width: '100%', minWidth: 480, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {COLUMNS.map(col => (
              <th
                key={col.key}
                onClick={() => toggle(col.key)}
                style={{
                  position: 'sticky', top: 0, zIndex: 1,
                  padding: '8px 12px', textAlign: col.align, whiteSpace: 'nowrap',
                  fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                  background: C.surface, borderBottom: `1px solid ${C.border}`,
                  color: sort.key === col.key ? C.activeText : C.text,
                }}
              >
                {col.label}{sort.key === col.key ? (sort.ascending ? ' ↑' : ' ↓') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(person => (
            <tr key={person.name}>
              {COLUMNS.map(col => (
                <td
                  key={col.key}
                  style={{
                    padding: '5px 12px', textAlign: col.align, fontSize: 12.5,
                    borderBottom: `1px solid ${C.border}`,
                    fontVariantNumeric: 'tabular-nums',
                    color: col.key === 'name' || col.strong ? C.text : C.muted,
                  }}
                >
                  {col.key === 'name' ? person.name : fmt(person[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

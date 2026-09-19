import { useMemo, useState } from 'react'
import { DIR_FILTERS, overallPct, pctOf, pctTone, sortRows } from '../../lib/useArchiveReport'
import { fmt } from '../../components/admin/format'
import { C } from '../tokens'

/**
 * Every directory in the archive and how far each processor got through it.
 *
 * This is the table you come to when a number elsewhere looks wrong: it is
 * almost always one folder — a batch of scans, an import that fell over
 * halfway — rather than a fault in the processor. Sorting by the overall
 * column finds it in one click.
 */
const COLUMNS = [
  { key: 'path', label: 'Folder', align: 'left' },
  { key: 'total', label: 'Files', align: 'right' },
  { key: 'overall', label: 'Done', align: 'right', pct: true, strong: true },
  { key: 'mpp', label: 'Metadata', align: 'right', pct: true },
  { key: 'objects', label: 'Objects', align: 'right', pct: true },
  { key: 'clip', label: 'Described', align: 'right', pct: true },
  { key: 'md5', label: 'Fingerprint', align: 'right', pct: true },
  { key: 'perceptual', label: 'Visual', align: 'right', pct: true },
  { key: 'gps', label: 'Located', align: 'right', pct: true, quiet: true },
  { key: 'geo', label: 'Named', align: 'right', pct: true, quiet: true },
]

const valueOf = (row, key) => {
  if (key === 'path') return row.path
  if (key === 'total') return row.total ?? -1
  if (key === 'overall') return overallPct(row)
  return pctOf(row, key)
}

export function DirTable({ rows }) {
  const [mode, setMode] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: 'total', ascending: false })

  const shown = useMemo(() => {
    const test = DIR_FILTERS.find(f => f.key === mode)?.test || (() => true)
    const matched = rows.filter(r => test(r) && r.path.includes(query))
    return sortRows(matched, sort.key, sort.ascending, valueOf)
  }, [rows, mode, query, sort])

  const toggle = key => setSort(s => (
    s.key === key
      ? { key, ascending: !s.ascending }
      : { key, ascending: key === 'path' }
  ))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        {DIR_FILTERS.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => setMode(f.key)}
            style={{
              height: 28, padding: '0 12px', borderRadius: 14, fontSize: 12, font: 'inherit',
              border: `1px solid ${mode === f.key ? C.activeText : C.border}`,
              background: mode === f.key ? C.activeBg : C.bg,
              color: mode === f.key ? C.activeText : C.text,
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Which folder?"
          style={{
            height: 28, padding: '0 10px', width: 160,
            border: `1px solid ${C.border}`, borderRadius: 8,
            font: 'inherit', fontSize: 12, color: C.text, background: C.bg,
          }}
        />
        <span style={{ marginLeft: 'auto', fontSize: 11.5, color: C.muted }}>
          {shown.length.toLocaleString()} of {rows.length.toLocaleString()}
        </span>
      </div>

      <div style={{
        maxHeight: 520, overflow: 'auto',
        border: `1px solid ${C.border}`, borderRadius: 10,
      }}>
        <table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => toggle(col.key)}
                  style={{
                    position: 'sticky', top: 0, zIndex: 1,
                    padding: '8px 10px', textAlign: col.align, whiteSpace: 'nowrap',
                    fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                    background: C.surface, borderBottom: `1px solid ${C.border}`,
                    color: sort.key === col.key ? C.activeText : (col.quiet ? C.muted : C.text),
                  }}
                >
                  {col.label}{sort.key === col.key ? (sort.ascending ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map(row => (
              <tr key={row.path}>
                {COLUMNS.map(col => (
                  <Cell key={col.key} row={row} col={col} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Cell({ row, col }) {
  const base = {
    padding: '5px 10px', textAlign: col.align, fontSize: 12,
    borderBottom: `1px solid ${C.border}`, fontVariantNumeric: 'tabular-nums',
  }

  if (col.key === 'path') {
    return (
      <td style={{ ...base, fontFamily: 'ui-monospace, monospace', fontSize: 11.5 }}>
        {row.path}
      </td>
    )
  }
  if (col.key === 'total') return <td style={base}>{fmt(row.total)}</td>

  const pct = valueOf(row, col.key)
  if (pct == null) return <td style={{ ...base, color: C.muted }}>—</td>

  return (
    <td style={{
      ...base,
      // Only the shortfall is coloured. A table where nine columns of green
      // shout at once is a table nobody reads; what matters is the one cell
      // that is not finished.
      color: pct >= 99 ? C.muted : pctTone(pct),
      fontWeight: col.strong && pct < 99 ? 500 : 400,
    }}>
      {pct.toFixed(0)}%
    </td>
  )
}

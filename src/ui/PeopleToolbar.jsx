import { LayoutGrid, List, Search } from 'lucide-react'
import { C } from './tokens'
import { SORTS } from '../lib/peopleSort'

/**
 * Search, sort and view for the people list.
 *
 * Its own component because the page was carrying the fetch, the filter, three
 * pieces of view state and forty lines of controls, and the controls are the
 * part that will keep changing.
 */


export function PeopleToolbar({ query, onQuery, sort, onSort, view, onView }) {
  return (
    <>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 8,
        height: 36, padding: '0 14px', borderRadius: 18,
        background: C.surface, minWidth: 220, flex: '0 1 280px',
      }}>
        <Search size={15} color={C.muted} />
        <input
          value={query}
          onChange={e => onQuery(e.target.value)}
          placeholder="Search people"
          aria-label="Search people"
          style={{
            border: 0, background: 'transparent', outline: 'none',
            font: 'inherit', fontSize: 13.5, color: C.text, width: '100%',
          }}
        />
      </label>

      <label style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 12.5, color: C.muted,
      }}>
        Sort
        <select
          value={sort}
          onChange={e => onSort(e.target.value)}
          style={{
            height: 34, padding: '0 8px', borderRadius: 8,
            border: `1px solid ${C.border}`, background: C.bg,
            font: 'inherit', fontSize: 13, color: C.text, cursor: 'pointer',
          }}
        >
          {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </label>

      <div
        role="group"
        aria-label="View"
        style={{
          display: 'inline-flex', border: `1px solid ${C.border}`,
          borderRadius: 17, overflow: 'hidden', height: 34,
        }}
      >
        {[
          { key: 'grid', icon: LayoutGrid, label: 'Grid view' },
          { key: 'list', icon: List, label: 'List view' },
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onView(key)}
            aria-label={label}
            aria-pressed={view === key}
            title={label}
            style={{
              display: 'grid', placeItems: 'center', width: 38,
              border: 0, cursor: 'pointer',
              background: view === key ? C.activeBg : 'transparent',
              color: view === key ? C.activeText : C.muted,
            }}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>
    </>
  )
}

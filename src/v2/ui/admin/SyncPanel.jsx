import { C } from '../tokens'
import { fmt } from '../../../components/admin/format'

/**
 * The one number worth looking at: does the archive on disk match the archive
 * the app thinks it has.
 *
 * Only archive and heritage count. Staging is shown separately and without
 * alarm — files sitting there un-indexed are the backlog working as intended,
 * and folding them in here made a healthy archive read as 40% broken.
 */
export function SyncPanel({ summary }) {
  const { syncPct, missing, onDisk, inGraph } = summary
  const tone = syncPct >= 98 ? '#137333' : syncPct >= 90 ? '#a15c00' : '#c5221f'

  return (
    <div style={{
      display: 'grid', gap: 1, marginBottom: 26,
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      border: `1px solid ${C.border}`, borderRadius: 12,
      background: C.border, overflow: 'hidden',
    }}>
      <Cell label="Tracked in the app" value={fmt(inGraph)} sub="known to the graph" />
      <Cell label="On disk" value={fmt(onDisk)} sub="archive + heritage" />
      <Cell
        label="Matched"
        value={`${syncPct.toFixed(1)}%`}
        sub={missing > 0 ? `${fmt(missing)} unaccounted for` : 'everything matched'}
        tone={tone}
        big
      />
    </div>
  )
}

function Cell({ label, value, sub, tone, big }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 3, padding: '16px 12px', background: C.bg,
    }}>
      <span style={{ fontSize: 11.5, color: C.muted }}>{label}</span>
      <span style={{
        fontSize: big ? 34 : 26, lineHeight: 1.1,
        color: tone || C.text, fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </span>
      <span style={{ fontSize: 11.5, color: C.muted }}>{sub}</span>
    </div>
  )
}

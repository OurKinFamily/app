import { C } from '../tokens'

/**
 * How far each processing pass has got through a tree, per sidecar.
 *
 * The disk report has collected this all along and the page never showed it,
 * which is how heritage sat at half-processed without anyone noticing. Worth
 * saying why it was hidden: the raw counts measure every pass against every
 * file, so posters read 14% because photographs do not have one. The report
 * now carries an `eligible` count per pass and the percentage uses that.
 *
 * Optional passes — subtitles, transcriptions — are listed last and muted.
 * They exist for a handful of items on purpose, so a low number there is not
 * a gap and should not read like one.
 */

// Green once a pass has essentially finished, amber mid-run, red when a tree
// has barely been touched. Wide middle band on purpose: 96% is in progress.
function tone(pct) {
  if (pct == null) return C.muted
  if (pct >= 99) return '#137333'
  if (pct >= 80) return '#a15c00'
  return '#c5221f'
}

const LABEL = {
  mpp: 'Metadata',
  objects: 'Objects',
  clip: 'Description',
  scenes: 'Scene',
  faces: 'Faces',
  poster: 'Poster frame',
  srt: 'Subtitles',
  txt: 'Transcription',
}

export function SidecarCoverage({ sidecars }) {
  if (!sidecars) return null
  const rows = Object.entries(sidecars).map(([key, v]) => {
    const eligible = v.eligible ?? 0
    // `present` counts every sidecar on disk; cap it so a stray one beside an
    // ineligible file cannot push a pass past 100%.
    const present = Math.min(v.present ?? 0, eligible)
    return {
      key,
      label: LABEL[key] || key,
      expected: v.expected !== false,
      present,
      eligible,
      missing: v.missing ?? 0,
      // Files the graph knows that have no sidecar — imported by a route
      // that does not write one. Counted as covered, and said out loud so
      // the number does not look like it was quietly fudged.
      viaGraph: v.via_graph ?? 0,
      pct: eligible ? (present / eligible) * 100 : null,
    }
  })
  const required = rows.filter(r => r.expected)
  const optional = rows.filter(r => !r.expected)

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {required.map(r => <Row key={r.key} row={r} />)}
      {required.some(r => r.viaGraph > 0) && (
        <p style={{ fontSize: 11.5, color: C.muted, margin: '6px 0 0', maxWidth: '74ch' }}>
          {required.filter(r => r.viaGraph > 0).map(r =>
            `${r.viaGraph.toLocaleString()} counted as ${r.label.toLowerCase()} because the app
             holds them, though no sidecar exists — scrapbook pages come in through the document
             importer, which never writes one.`).join(' ')}
        </p>
      )}
      {optional.length > 0 && (
        <>
          <p style={{ fontSize: 11.5, color: C.muted, margin: '8px 0 0' }}>
            Done by hand for a few items rather than run over everything — a low
            number here is not a gap.
          </p>
          {optional.map(r => <Row key={r.key} row={r} muted />)}
        </>
      )}
    </div>
  )
}

function Row({ row, muted }) {
  const colour = muted ? C.muted : tone(row.pct)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
      <span style={{ width: 104, color: muted ? C.muted : C.text, flexShrink: 0 }}>
        {row.label}
      </span>
      <div style={{
        flex: 1, height: 7, borderRadius: 4, background: C.surface, overflow: 'hidden',
      }}>
        <div style={{
          width: `${row.pct ?? 0}%`, height: '100%', background: colour,
          borderRadius: 4,
        }} />
      </div>
      <span style={{
        width: 52, textAlign: 'right', color: colour,
        fontVariantNumeric: 'tabular-nums', flexShrink: 0,
      }}>
        {row.pct == null ? '—' : `${row.pct.toFixed(1)}%`}
      </span>
      <span style={{
        width: 118, textAlign: 'right', color: C.muted,
        fontVariantNumeric: 'tabular-nums', flexShrink: 0, fontSize: 11.5,
      }}>
        {row.missing > 0
          ? `${row.missing.toLocaleString()} of ${row.eligible.toLocaleString()} missing`
          : `all ${row.eligible.toLocaleString()}`}
      </span>
    </div>
  )
}

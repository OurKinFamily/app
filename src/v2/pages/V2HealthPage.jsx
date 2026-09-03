import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { SyncPanel } from '../ui/admin/SyncPanel'
import { Section, StatGrid, StatTile, BarBuckets } from '../ui/admin/Stats'
import { InspectBucket } from '../ui/admin/InspectBucket'
import { LoadingDots } from '../ui/LoadingDots'
import { useDiskReport, READINESS, TONES } from '../lib/useDiskReport'
import { fmt, bytes, relTime } from '../../components/admin/format'
import { C } from '../ui/tokens'

/**
 * Is the archive on disk and the archive in the app still the same archive?
 *
 * Ordered as the question is actually asked: the match first, then whatever is
 * unaccounted for and what to do about it, then the inventory for anybody who
 * wants to browse rather than fix.
 *
 * The counterpart page is Analytics, which asks what is IN the archive. This
 * one only asks whether it is all there.
 */
export function V2HealthPage() {
  const { disk, summary, error, rescanning, rescan } = useDiskReport()
  const [inspect, setInspect] = useState(null)

  if (error) return <p style={{ fontSize: 13, color: '#c5221f' }}>{error}</p>
  if (!disk) return <LoadingDots />

  const readiness = summary.drift.on_disk_not_in_graph?.readiness || {}
  const piles = READINESS.filter(b => (readiness[b.key] || 0) > 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '4px 0 6px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, margin: 0 }}>Health</h1>
        <span style={{ fontSize: 12, color: C.muted }}>{relTime(disk.generated)}</span>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={rescan} disabled={rescanning} style={pill}>
          <RefreshCw size={14} /> {rescanning ? 'Walking the disk…' : 'Rescan'}
        </button>
      </div>

      <p style={{ fontSize: 12.5, color: C.muted, margin: '0 0 18px', maxWidth: '76ch' }}>
        Walks <code style={code}>{disk.photos_root}</code> and checks it against what the
        graph believes is there. The last walk took {disk.duration_seconds?.toFixed(1)}s.
      </p>

      <SyncPanel summary={summary} />

      {piles.length > 0 && (
        <Section
          title="On disk, not in the app"
          aside={`${fmt(summary.unindexed)} files · grouped by what would happen to them`}
        >
          <div style={{ display: 'grid', gap: 8 }}>
            {piles.map(bucket => (
              <Pile
                key={bucket.key}
                bucket={bucket}
                count={readiness[bucket.key]}
                onOpen={() => setInspect({ ...bucket, count: readiness[bucket.key] })}
              />
            ))}
          </div>
        </Section>
      )}

      {summary.stale > 0 && (
        <Section title="In the app, not on disk" aside="records pointing at files that are gone">
          <Pile
            bucket={STALE}
            count={summary.stale}
            onOpen={() => setInspect({ ...STALE, count: summary.stale })}
          />
        </Section>
      )}

      {summary.staging.onDisk > 0 && (
        <Section title="Staging" aside="a workspace, not a system of record">
          <div style={{
            padding: 14, borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.bg,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 20, fontWeight: 400, fontVariantNumeric: 'tabular-nums' }}>
                {fmt(summary.staging.onDisk)}
              </strong>
              <span style={{ fontSize: 12.5, color: C.muted }}>files waiting to be sorted</span>
              {summary.staging.inGraph > 0 && (
                <span style={{ marginLeft: 'auto', fontSize: 11.5, color: C.muted }}>
                  {fmt(summary.staging.inGraph)} already indexed
                </span>
              )}
            </div>
            <p style={{ fontSize: 12.5, color: C.muted, margin: '6px 0 0', maxWidth: '72ch' }}>
              Nothing here is drift — it is backlog. Move a file into the archive when you
              have decided what it is.
            </p>
          </div>
        </Section>
      )}

      <Section title="What lives under /photos">
        <StatGrid>
          {Object.entries(summary.dirs).map(([name, d]) => (
            <StatTile
              key={name}
              label={name}
              value={fmt(d.media_total)}
              sub={`${bytes(d.media_bytes)} · ${bytes(d.sidecar_bytes)} of sidecars`}
            />
          ))}
        </StatGrid>
      </Section>

      <Section title="Photographs, video and sound">
        <StatGrid>
          {summary.kinds.map(([kind, n]) => (
            <StatTile key={kind} label={kind} value={fmt(n)} />
          ))}
        </StatGrid>
      </Section>

      <Section title="File types" aside={`${summary.extensions.length} of them`}>
        <BarBuckets buckets={summary.extensions} limit={6} />
      </Section>

      {summary.years.length > 0 && (
        <Section title="By year" aside="archive only, counted on disk">
          <BarBuckets buckets={summary.years} />
        </Section>
      )}

      <p style={{ fontSize: 11.5, color: C.muted }}>
        {bytes(summary.totalBytes)} across everything.
      </p>

      <InspectBucket bucket={inspect} drift={summary.drift} onClose={() => setInspect(null)} />
    </div>
  )
}

function Pile({ bucket, count, onOpen }) {
  const [lit, setLit] = useState(false)
  const tone = TONES[bucket.tone]

  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={() => setLit(true)}
      onMouseLeave={() => setLit(false)}
      style={{
        display: 'block', width: '100%', textAlign: 'left', font: 'inherit',
        padding: 12, borderRadius: 10, cursor: 'pointer',
        border: `1px solid ${lit ? C.muted : C.border}`,
        background: lit ? C.hover : C.bg,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          padding: '2px 9px', borderRadius: 999, fontSize: 11,
          background: tone.bg, color: tone.fg,
        }}>
          {bucket.label}
        </span>
        <span style={{ fontSize: 12.5, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
          {fmt(count)}
        </span>
      </div>
      <p style={{ fontSize: 12.5, color: C.muted, margin: '7px 0 0', maxWidth: '72ch' }}>
        {bucket.desc}
      </p>
    </button>
  )
}

const STALE = {
  kind: 'drop',
  key: 'stale',
  label: 'Gone from disk',
  tone: 'bad',
  flags: '',
  desc: 'The app still has a record of these, but the files are not there any more. Opening one in the gallery gives a broken image.',
}

const pill = {
  display: 'inline-flex', alignItems: 'center', gap: 7,
  height: 32, padding: '0 14px', borderRadius: 16, fontSize: 12.5,
  border: `1px solid ${C.border}`, background: 'transparent',
  color: C.text, cursor: 'pointer',
}
const code = {
  padding: '1px 5px', borderRadius: 4,
  background: C.surface, fontFamily: 'ui-monospace, monospace', fontSize: 11.5,
}

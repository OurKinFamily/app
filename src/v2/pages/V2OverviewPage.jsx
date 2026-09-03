import { Coverage, Issues, Split } from '../ui/admin/Coverage'
import { DirTable } from '../ui/admin/DirTable'
import { TopPeopleTable } from '../ui/admin/TopPeopleTable'
import { Section, StatGrid, StatTile } from '../ui/admin/Stats'
import { LoadingDots } from '../ui/LoadingDots'
import { ISSUES, pctTone, useArchiveReport } from '../lib/useArchiveReport'
import { fmt, relTime } from '../../components/admin/format'
import { C } from '../ui/tokens'

/**
 * The deep report: what every processor has and has not done, per directory.
 *
 * Not live. It is whatever the Archive Report job last wrote, which is a real
 * caveat rather than a footnote — a fortnight-old report on a fortnight of
 * imports says everything is fine when nothing has been touched. So the age of
 * it is stated at the top, in words, before any number.
 */
const PROCESSOR_COLOURS = {
  ImageProcessor: '#0b57d0',
  VideoProcessor: '#a142f4',
  HeritageProcessor: '#e37400',
  unknown: '#9aa0a6',
}

export function V2OverviewPage() {
  const { report, error, loading } = useArchiveReport()

  if (error) return <p style={{ fontSize: 13, color: '#c5221f' }}>{error}</p>
  if (loading) return <LoadingDots />

  const { totals, coverage, issues, extensions, processors, heritage, faces, scenes, people, by_dir } = report

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '4px 0 6px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, margin: 0 }}>Archive report</h1>
        <span style={{ fontSize: 12, color: C.muted }}>from {relTime(report.generated)}</span>
      </div>
      <p style={{ fontSize: 12.5, color: C.muted, margin: '0 0 18px', maxWidth: '76ch' }}>
        A walk over <code style={code}>{report.scanned_path}</code> that the Archive Report job
        makes. It does not update on its own — anything imported since is not in here.
      </p>

      <Section title="How much there is">
        <StatGrid>
          <StatTile label="Everything" value={fmt(totals.total)} />
          <StatTile label="Photographs" value={fmt(totals.images)} />
          <StatTile label="Film" value={fmt(totals.videos)} />
        </StatGrid>
      </Section>

      <Section title="How far each pass has got" aside="of everything eligible">
        <Coverage coverage={coverage} />
      </Section>

      <Section title="What is wrong or waiting" aside="red is a fault; the rest is a queue">
        <Issues issues={issues} list={ISSUES} />
      </Section>

      {processors && (
        <Section title="What handled them">
          <Split rows={sorted(processors)} colours={PROCESSOR_COLOURS} />
        </Section>
      )}

      {faces && <Faces faces={faces} />}

      {scenes && (
        <Section title="Scenes" aside="what 'somewhere like this' searches against">
          <StatGrid>
            <StatTile
              label="Understood"
              value={fmt(scenes.total)}
              sub={`${scenes.pct ?? '—'}% of ${fmt(scenes.eligible)}`}
            />
            <StatTile label="Photographs" value={fmt(scenes.images)} />
            <StatTile label="Film" value={fmt(scenes.videos)} />
          </StatGrid>
          {scenes.mixed_models && (
            <p style={{
              margin: '8px 0 0', padding: '8px 12px', borderRadius: 8,
              fontSize: 12, background: '#fef7e0', color: '#a15c00', maxWidth: '76ch',
            }}>
              Two different models were used. What they produce has different dimensions and
              cannot be compared, so similarity quietly fails across the split — one side needs
              rebuilding before it means anything.
            </p>
          )}
          {(scenes.models || scenes.dims) && (
            <div style={{ display: 'grid', gap: 14, marginTop: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {Object.keys(scenes.models || {}).length > 0 && (
                <div>
                  <Label>Model</Label>
                  <Split rows={sorted(scenes.models)} />
                </div>
              )}
              {Object.keys(scenes.dims || {}).length > 0 && (
                <div>
                  <Label>Dimensions</Label>
                  <Split rows={sorted(scenes.dims).map(([d, n]) => [`${d}-d`, n])} />
                </div>
              )}
            </div>
          )}
        </Section>
      )}

      <Section title="Older things" aside={`${fmt(heritage.total)} scanned prints, letters and documents`}>
        <StatGrid>
          {[
            ['with_context', 'Given a story'],
            ['with_people', 'People named'],
            ['with_content_date', 'Dated'],
            ['with_related', 'Tied to others'],
            ['with_physical', 'Object described'],
            ['with_transcription', 'Transcribed'],
          ].map(([key, label]) => {
            const entry = heritage[key]
            if (!entry) return null
            return (
              <div key={key} style={{
                padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: 11.5, color: C.muted }}>{label}</div>
                <div style={{ fontSize: 20, marginTop: 2, color: pctTone(entry.pct), fontVariantNumeric: 'tabular-nums' }}>
                  {entry.pct.toFixed(1)}%
                </div>
                <div style={{ fontSize: 11, color: C.muted }}>{fmt(entry.count)}</div>
              </div>
            )
          })}
        </StatGrid>
      </Section>

      {people && (
        <Section title="Most faces" aside={`out of ${fmt(people.total)} people, ${fmt(people.with_gallery)} with a face on file`}>
          <TopPeopleTable people={people} />
        </Section>
      )}

      <Section title="Folder by folder" aside="where an unfinished pass actually stopped">
        <DirTable rows={by_dir} />
      </Section>

      {extensions && (
        <Section title="File types">
          <Split rows={sorted(extensions).map(([ext, n]) => [`.${ext}`, n])} />
        </Section>
      )}
    </div>
  )
}

function Faces({ faces }) {
  const images = faces.images || {}
  const videos = faces.videos || {}
  const clusters = faces.clusters || {}
  const share = (a, b) => (b > 0 ? `${((a / b) * 100).toFixed(1)}% of them` : undefined)

  return (
    <Section title="Faces" aside="found, grouped, and how many are still nobody">
      <StatGrid>
        <StatTile
          label="Photographs looked at"
          value={`${fmt(images.scanned)} / ${fmt(images.eligible)}`}
          sub={share(images.scanned, images.eligible)}
        />
        <StatTile
          label="Film looked at"
          value={`${fmt(videos.scanned)} / ${fmt(videos.eligible)}`}
          sub={share(videos.scanned, videos.eligible)}
        />
        <StatTile
          label="Faces in photographs"
          value={fmt(images.total_detected)}
          sub={`${fmt(images.with_2plus)} with more than one`}
        />
        <StatTile label="Faces in film" value={fmt(videos.total_detected)} />
        <StatTile
          label="Groups"
          value={fmt(clusters.cluster_count)}
          sub={`${fmt(clusters.total_clustered_faces)} faces between them`}
        />
        <StatTile
          label="Named"
          value={fmt(clusters.assigned_count)}
          sub={`${fmt((clusters.cluster_count || 0) - (clusters.assigned_count || 0))} still nobody`}
        />
        <StatTile
          label="Fit nowhere"
          value={fmt(clusters.noise_faces)}
          sub={`${fmt(clusters.noise_subclusters)} loose groups`}
        />
        <StatTile label="Set aside" value={fmt(clusters.skipped_faces)} sub="passed over on purpose" />
      </StatGrid>
    </Section>
  )
}

const sorted = obj => Object.entries(obj || {}).sort((a, b) => b[1] - a[1])

const Label = ({ children }) => (
  <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 6 }}>{children}</div>
)

const code = {
  padding: '1px 5px', borderRadius: 4,
  background: C.surface, fontFamily: 'ui-monospace, monospace', fontSize: 11.5,
}

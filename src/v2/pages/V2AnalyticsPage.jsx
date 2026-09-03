import { useState } from 'react'
import { ArchiveCounts } from '../ui/admin/ArchiveCounts'
import { Bars, BrightnessTiles, HueTiles } from '../ui/admin/Colours'
import { Drill } from '../ui/admin/Drill'
import { Section, StatGrid, StatTile } from '../ui/admin/Stats'
import { LoadingDots } from '../ui/LoadingDots'
import { Avatar } from '../ui/Avatar'
import { drillInto, shareOf, useAnalytics, HUES } from '../lib/useAnalytics'
import { fmt, relTime } from '../../components/admin/format'
import { mediaUrl } from '../../lib/media'
import { C } from '../ui/tokens'

/**
 * What is in the archive, as opposed to whether it is all there — that is the
 * Health page's question.
 *
 * Everything here opens. A bar saying 4,000 photographs were taken on a Sunday
 * is trivia; the same bar clicked, showing that they are mostly of one person
 * at one house, is how somebody finds the thread they came for.
 */
export function V2AnalyticsPage() {
  const { data, buckets, summaries, error, loading } = useAnalytics()
  const [drill, setDrill] = useState(null)

  if (error) return <p style={{ fontSize: 13, color: '#c5221f' }}>{error}</p>
  if (loading) return <LoadingDots />

  const total = data.media.total
  const colours = data.colors
  const sumOf = rows => (rows || []).reduce((a, r) => a + r.count, 0)

  const openBucket = (kind, bucket, all, hide = []) => setDrill(drillInto(kind, bucket.key, {
    title: bucket.label,
    count: bucket.count,
    percent: shareOf(bucket, all),
    hide,
  }))

  const openHue = (row, source, rows) => setDrill({
    title: row.hue,
    count: row.count,
    percent: sumOf(rows) ? (row.count / sumOf(rows)) * 100 : 0,
    hide: [],
    hero: (
      <span style={{
        width: 18, height: 18, borderRadius: 5, display: 'inline-block',
        background: row.samples?.length === 4
          ? `linear-gradient(135deg, ${row.samples.join(', ')})`
          : (HUES[row.hue] || HUES.mixed),
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.15)',
      }} />
    ),
    insightsUrl: `/api/admin/archive-overview/hue/${encodeURIComponent(row.hue)}/objects?limit=5&source=${source}`,
    samplesUrl: `/api/admin/archive-overview/hue/${encodeURIComponent(row.hue)}/samples?limit=48&source=${source}`,
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '4px 0 6px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, margin: 0 }}>What is in here</h1>
        <span style={{ fontSize: 12, color: C.muted }}>{relTime(data.generated)}</span>
      </div>
      <p style={{ fontSize: 12.5, color: C.muted, margin: '0 0 18px', maxWidth: '76ch' }}>
        Counted out of the graph. Anything you can click opens onto the photographs behind it.
      </p>

      <ArchiveCounts data={data} summaries={summaries} />

      <Section title="Most photographed" aside="click a name to see them">
        <div style={{ display: 'grid', gap: 3 }}>
          {(buckets.people || []).map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => setDrill(drillInto('people', p.key, {
                title: p.label,
                count: p.count,
                percent: total ? (p.count / total) * 100 : 0,
                hide: ['person'],
                hero: <Avatar name={p.label} src={p.avatar ? mediaUrl(p.avatar) : null} size={22} />,
              }))}
              style={row}
            >
              <Avatar name={p.label} src={p.avatar ? mediaUrl(p.avatar) : null} size={26} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, textAlign: 'left' }}>{p.label}</span>
              <span style={{ fontSize: 12, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
                {fmt(p.count)}
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Colour" aside="the colour each photograph is mostly made of">
        <HueTiles
          rows={colours.dominant_by_hue}
          total={sumOf(colours.dominant_by_hue)}
          onOpen={row => openHue(row, 'dominant', colours.dominant_by_hue)}
        />
      </Section>

      {colours.mean_by_hue?.length > 0 && (
        <Section title="Average colour" aside="every pixel averaged into one">
          <HueTiles
            rows={colours.mean_by_hue}
            total={sumOf(colours.mean_by_hue)}
            onOpen={row => openHue(row, 'mean', colours.mean_by_hue)}
          />
        </Section>
      )}

      {colours.salient_by_hue?.length > 0 && (
        <Section title="What catches the eye" aside="the colour of the part you look at first">
          <HueTiles
            rows={colours.salient_by_hue}
            total={sumOf(colours.salient_by_hue)}
            onOpen={row => openHue(row, 'salient', colours.salient_by_hue)}
          />
        </Section>
      )}

      <Section title="Light and dark">
        <BrightnessTiles rows={colours.dominant_by_brightness} />
      </Section>

      <Section title="By day of the week" aside="when the shutter went">
        <Bars buckets={buckets.weekday} onOpen={b => openBucket('weekday', b, buckets.weekday, ['weekday'])} />
      </Section>

      <Section title="By hour" aside="when the shutter went">
        <Bars buckets={buckets.hour} onOpen={b => openBucket('hour', b, buckets.hour, ['weekday'])} />
      </Section>

      <Section title="By month" aside="when the shutter went">
        <Bars buckets={buckets.month} onOpen={b => openBucket('month', b, buckets.month)} />
      </Section>

      <Section title="By camera">
        <Bars buckets={buckets.camera} onOpen={b => openBucket('camera', b, buckets.camera, ['camera'])} />
      </Section>

      <Section title="By place">
        <Bars buckets={buckets.location} onOpen={b => openBucket('location', b, buckets.location, ['city'])} />
      </Section>

      <Section title="By state">
        <Bars buckets={buckets.state} onOpen={b => openBucket('state', b, buckets.state)} />
      </Section>

      <Section title="By decade">
        <Bars buckets={buckets.decade} onOpen={b => openBucket('decade', b, buckets.decade)} />
      </Section>

      <Section title="How many people in the frame">
        <StatGrid min={130}>
          {data.trivia.people_per_photo.map(b => (
            <StatTile
              key={b.bucket}
              label={b.bucket === '0' ? 'Nobody' : `${b.bucket} ${b.bucket === '1' ? 'person' : 'people'}`}
              value={fmt(b.count)}
              onClick={() => setDrill(drillInto('people_per_photo', b.bucket, {
                title: b.bucket === '0' ? 'Nobody in the frame' : `${b.bucket} in the frame`,
                count: b.count,
                percent: total ? (b.count / total) * 100 : 0,
              }))}
            />
          ))}
        </StatGrid>
      </Section>

      <Section title="Busiest days" aside="the days somebody could not stop">
        <div style={{ display: 'grid', gap: 3 }}>
          {data.trivia.busiest_days.map(b => {
            const label = new Date(`${b.day}T00:00:00`).toLocaleDateString(undefined, {
              weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
            })
            return (
              <button
                key={b.day}
                type="button"
                onClick={() => setDrill(drillInto('day', b.day, {
                  title: label,
                  count: b.count,
                  percent: total ? (b.count / total) * 100 : 0,
                }))}
                style={row}
              >
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, textAlign: 'left' }}>{label}</span>
                <span style={{ fontSize: 12, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(b.count)}
                </span>
              </button>
            )
          })}
        </div>
      </Section>

      <Drill drill={drill} onClose={() => setDrill(null)} />
    </div>
  )
}

const row = {
  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
  padding: '5px 6px', border: 0, borderRadius: 8,
  background: 'transparent', font: 'inherit', cursor: 'pointer',
}

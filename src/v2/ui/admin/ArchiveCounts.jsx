import { Section, StatGrid, StatTile } from './Stats'
import { fmt } from '../../../components/admin/format'
import { C } from '../tokens'

/**
 * The plain counts: how much of everything there is.
 *
 * These come from the overview call in one lump, and none of them opens
 * anything — they are the sentence the rest of the page elaborates on.
 */
export function ArchiveCounts({ data, summaries }) {
  const { media, people, edges, places, trivia, heritage, engagement, timestamps } = data
  const { faceClusters, scenes } = summaries

  return (
    <>
      <Section title="The archive">
        <StatGrid>
          <StatTile label="Photographs and film" value={fmt(media.total)} sub={`${(media.total_bytes / 1e9).toFixed(0)} GB`} />
          <StatTile label="People" value={fmt(people.total)} sub={`${people.with_avatar} with a face chosen`} />
          <StatTile label="Appearances" value={fmt(edges.appears_in)} sub="somebody in a photograph" />
          <StatTile label="Located" value={fmt(places.with_gps)} sub={`${places.distinct_cities} places`} />
          <StatTile label="Cameras" value={fmt(trivia.distinct_cameras)} sub={`${trivia.avg_megapixels.toFixed(1)} MP on average`} />
          <StatTile label="Longest run" value={fmt(trivia.longest_daily_streak)} sub="days in a row with a photograph" />
        </StatGrid>
      </Section>

      <Section title="Kinds of thing" aside="how the graph labels them">
        <StatGrid>
          {media.by_type.slice(0, 6).map(t => (
            <StatTile
              key={t.labels.join('-')}
              label={t.labels.filter(l => l !== 'Media')[0] || 'Media'}
              value={fmt(t.count)}
            />
          ))}
        </StatGrid>
      </Section>

      <Section title="Older things" aside="scanned prints, letters and documents">
        <StatGrid>
          <StatTile label="Heritage items" value={fmt(heritage.total)} />
          <StatTile label="Dated" value={fmt(heritage.with_content_date)} />
          <StatTile label="Described" value={fmt(heritage.with_description)} />
          <StatTile label="Transcribed" value={fmt(heritage.with_transcription)} />
        </StatGrid>
        {(heritage.by_physical_status || []).length > 0 && (
          <div style={{ marginTop: 8 }}>
            <StatGrid>
              {heritage.by_physical_status.map(b => (
                <StatTile
                  key={b.status}
                  label={b.status.replace(/_/g, ' ').toLowerCase()}
                  value={fmt(b.count)}
                />
              ))}
            </StatGrid>
          </div>
        )}
      </Section>

      <Section title="Made by hand" aside="what somebody sat down and did">
        <StatGrid>
          <StatTile label="Albums" value={fmt(engagement.albums)} />
          <StatTile label="Collections" value={fmt(engagement.collections)} />
          <StatTile label="Groups" value={fmt(engagement.groups)} />
          <StatTile label="Favourites" value={fmt(engagement.favorites)} />
          <StatTile label="Dates corrected" value={fmt(engagement.manual_redates)} />
          <StatTile label="Open suggestions" value={fmt(engagement.suggestions_open)} />
        </StatGrid>
      </Section>

      <Section title="The family" aside="what the graph holds about people">
        <StatGrid>
          <StatTile label="People" value={fmt(people.total)} />
          <StatTile label="With photographs" value={fmt(people.with_gallery)} />
          <StatTile label="From records" value={fmt(people.with_gedcom_id)} />
          <StatTile label="Passed" value={fmt(people.deceased)} />
          <StatTile label="Marriages" value={fmt(edges.married_to)} />
          <StatTile label="Parent and child" value={fmt(edges.parent_of)} />
        </StatGrid>
      </Section>

      {faceClusters?.available && (
        <Section title="Faces" aside="grouped by what they look like, before anybody names them">
          <StatGrid>
            <StatTile label="Groups" value={fmt(faceClusters.total_clusters)} />
            <StatTile label="Faces found" value={fmt(faceClusters.total_faces)} />
            <StatTile label="Named" value={fmt(faceClusters.assigned_faces)} />
            <StatTile label="Still unknown" value={fmt(faceClusters.unassigned_faces)} />
          </StatGrid>
        </Section>
      )}

      {scenes?.available && (
        <Section title="Places and scenes" aside="what makes 'more like this' work">
          <StatGrid>
            <StatTile
              label="Understood"
              value={fmt(scenes.total)}
              sub={scenes.pct != null ? `${scenes.pct}% of what could be` : undefined}
            />
            <StatTile label="Photographs" value={fmt(scenes.images)} />
            <StatTile label="Film" value={fmt(scenes.videos)} />
            <StatTile label="Not yet" value={fmt(scenes.missing)} />
          </StatGrid>
          {scenes.models?.length > 1 && (
            <p style={{
              margin: '8px 0 0', padding: '8px 12px', borderRadius: 8,
              fontSize: 12, background: '#fef7e0', color: '#a15c00',
            }}>
              Two different models have been used — {scenes.models.map(m => `${m.name} (${fmt(m.count)})`).join(', ')}.
              What they produce cannot be compared, so similarity across the two is meaningless until one is rebuilt.
            </p>
          )}
        </Section>
      )}

      <Section title="How sure the dates are">
        <StatGrid>
          {timestamps.by_confidence.map(b => (
            <StatTile key={b.confidence} label={b.confidence} value={fmt(b.count)} />
          ))}
        </StatGrid>
        <div style={{ fontSize: 11.5, color: C.muted, margin: '10px 0 6px' }}>
          Where the date came from
        </div>
        <StatGrid min={130}>
          {timestamps.by_source.map(b => (
            <StatTile key={b.source} label={b.source} value={fmt(b.count)} />
          ))}
        </StatGrid>
      </Section>
    </>
  )
}

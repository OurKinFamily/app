import { useEffect, useState } from 'react'
import { Modal } from '../Modal'
import { Avatar } from '../Avatar'
import { fmt } from '../../components/admin/format'
import { mediaUrl } from '../../lib/media'
import { C } from '../tokens'

/**
 * What a slice of the archive is actually made of.
 *
 * Any bar, tile or colour on the analytics page opens this. Two questions get
 * answered: who and what tends to be in these photographs, and — since no
 * summary beats looking — a wall of them.
 */
export function Drill({ drill, onClose }) {
  const { samples, insights, error } = useDrillData(drill)
  if (!drill) return null

  const cards = [
    ['group', insights?.top_group],
    ['person', insights?.top_person],
    ['city', insights?.top_city],
    ['weekday', insights?.top_weekday],
    ['camera', insights?.top_camera],
  ]
    .filter(([kind, data]) => data && !drill.hide.includes(kind))
    .slice(0, 3)

  return (
    <Modal title={drill.title} onClose={onClose} width={980}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        {drill.hero}
        <span style={{ fontSize: 12.5, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
          {fmt(drill.count)} photographs · {drill.percent.toFixed(1)}% of the archive
        </span>
      </div>

      {error && <p style={{ fontSize: 13, color: '#c5221f' }}>{error}</p>}
      {!samples && !error && <p style={{ fontSize: 13, color: C.muted }}>Looking…</p>}

      {cards.length > 0 && (
        <>
          <Label>Usually</Label>
          <div style={{
            display: 'grid', gap: 8, marginBottom: 16,
            gridTemplateColumns: `repeat(${cards.length}, minmax(0, 1fr))`,
          }}>
            {cards.map(([kind, data]) => <Card key={kind} kind={kind} data={data} />)}
          </div>
        </>
      )}

      {insights?.objects?.length > 0 && (
        <>
          <Label>What is in them</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 16 }}>
            {insights.objects.map(o => (
              <span
                key={o.object}
                title={`${o.count.toLocaleString()} of ${insights.total.toLocaleString()}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '3px 10px', borderRadius: 999, fontSize: 11.5,
                  border: `1px solid ${C.border}`,
                }}
              >
                <span style={{ textTransform: 'capitalize' }}>{o.object}</span>
                <span style={{ color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
                  {(o.share * 100).toFixed(0)}%
                </span>
              </span>
            ))}
          </div>
        </>
      )}

      {samples?.length === 0 && <p style={{ fontSize: 13, color: C.muted }}>Nothing to show.</p>}

      {samples?.length > 0 && (
        <div style={{
          display: 'grid', gap: 5,
          gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
        }}>
          {samples.map((s, i) => (
            <div key={`${s.path}-${i}`} style={{ position: 'relative' }}>
              <img
                src={s.thumb_url}
                alt=""
                loading="lazy"
                style={{
                  width: '100%', aspectRatio: '1', objectFit: 'cover',
                  borderRadius: 8, background: C.hover, display: 'block',
                }}
              />
              {/* The colour the archive filed it under, in the corner. It is
                  the whole reason the colour sections work, and seeing it
                  against the photograph is how you tell a good call from a
                  strange one. */}
              <span
                title={s.color}
                style={{
                  position: 'absolute', right: 5, bottom: 5,
                  width: 11, height: 11, borderRadius: 3,
                  background: s.color || C.muted,
                  boxShadow: '0 0 0 1px rgba(0,0,0,.3)',
                }}
              />
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

function useDrillData(drill) {
  const [state, setState] = useState({ url: null, samples: null, insights: null, error: null })
  const { samplesUrl, insightsUrl } = drill || {}

  useEffect(() => {
    if (!samplesUrl) return
    let alive = true
    Promise.all([
      fetch(samplesUrl).then(r => (r.ok ? r.json() : Promise.reject(new Error(`came back ${r.status}`)))),
      fetch(insightsUrl).then(r => (r.ok ? r.json() : Promise.reject(new Error(`came back ${r.status}`)))),
    ])
      .then(([s, o]) => alive && setState({ url: samplesUrl, samples: s.samples || [], insights: o, error: null }))
      .catch(e => alive && setState({ url: samplesUrl, samples: null, insights: null, error: e.message }))
    return () => { alive = false }
  }, [samplesUrl, insightsUrl])

  // Which slice the held answer belongs to, rather than clearing it when the
  // slice changes. Clearing means a setState in the effect body, which starts
  // a second render before the first has painted; comparing costs nothing and
  // says the same thing — anything not about the slice being asked about is
  // not an answer yet.
  return state.url === samplesUrl ? state : { samples: null, insights: null, error: null }
}

const LABELS = {
  person: 'The person', group: 'Together', city: 'The place',
  weekday: 'The day', camera: 'The camera',
}

function Card({ kind, data }) {
  const primary = {
    person: data.name,
    group: data.names?.join(' & '),
    city: [data.city, data.state].filter(Boolean).join(', '),
    weekday: data.weekday,
    camera: data.model || data.make || '—',
  }[kind]

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 6, padding: 12, borderRadius: 10, textAlign: 'center',
      border: `1px solid ${C.border}`,
    }}>
      <span style={{ fontSize: 11, color: C.muted }}>{LABELS[kind]}</span>
      {kind === 'person' && (
        <Avatar name={data.name || '?'} src={data.avatar ? mediaUrl(data.avatar) : null} size={44} />
      )}
      <span style={{ fontSize: 13.5, lineHeight: 1.3, wordBreak: 'break-word' }}>{primary}</span>
      <span style={{ fontSize: 11, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
        {fmt(data.count)} photographs
      </span>
    </div>
  )
}

const Label = ({ children }) => (
  <div style={{ fontSize: 11.5, fontWeight: 500, color: C.muted, marginBottom: 6 }}>
    {children}
  </div>
)

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../ui/Avatar'
import { LoadingDots } from '../ui/LoadingDots'
import { MediaDetail } from '../ui/MediaDetail'
import { getCluster, getClusters } from '../../lib/api'
import { mediaUrl } from '../../lib/media'
import { C } from '../ui/tokens'

/**
 * The faces already attached to somebody, grouped as the clusterer sees them.
 *
 * Its use is checking rather than doing: a cluster of fourteen thousand faces
 * that has picked up a stranger is invisible until somebody looks, and this is
 * where they look. So the list is people, and the panel is that person's faces
 * at a size where a wrong one stands out.
 */

const PAGE = 50

export function V2AssignedFaces() {
  const [clusters, setClusters] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [chosen, setChosen] = useState(null)

  const load = useCallback(async (offset = 0) => {
    const data = await getClusters('assigned', PAGE, offset).catch(() => null)
    if (!data) { setLoading(false); return }
    setClusters(prev => (offset ? [...prev, ...data.clusters] : data.clusters))
    setTotal(data.total || 0)
    setLoading(false)
  }, [])

  useEffect(() => {
    // Awaited rather than called bare: `load` sets state, and a promise
    // started in an effect body resolves after this render either way.
    let alive = true
    getClusters('assigned', PAGE, 0)
      .then(d => {
        if (!alive) return
        setClusters(d.clusters || [])
        setTotal(d.total || 0)
        setLoading(false)
      })
      .catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  if (loading) return <LoadingDots />

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '4px 0 16px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, margin: 0 }}>Assigned faces</h1>
        <span style={{ fontSize: 13, color: C.muted }}>
          {total.toLocaleString()} {total === 1 ? 'person' : 'people'}
        </span>
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'minmax(220px, 300px) 1fr' }}>
        <div style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }} className="hide-scrollbar">
          {clusters.map(c => (
            <ClusterRow
              key={c.id}
              cluster={c}
              selected={chosen?.id === c.id}
              onClick={() => setChosen(c)}
            />
          ))}
          {clusters.length < total && (
            <button type="button" onClick={() => load(clusters.length)} style={more}>
              Show more
            </button>
          )}
        </div>

        <ClusterFaces cluster={chosen} />
      </div>
    </div>
  )
}

function ClusterRow({ cluster, selected, onClick }) {
  const [lit, setLit] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setLit(true)}
      onMouseLeave={() => setLit(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '6px 8px', marginBottom: 2, borderRadius: 8, textAlign: 'left',
        border: 0, font: 'inherit', cursor: 'pointer',
        background: selected ? C.activeBg : lit ? C.hover : 'transparent',
        color: selected ? C.activeText : C.text,
      }}
    >
      <img
        src={cluster.samples?.[0]}
        alt=""
        loading="lazy"
        style={{
          width: 34, height: 34, borderRadius: 6, objectFit: 'cover',
          background: C.hover, flex: '0 0 auto',
        }}
        onError={e => { e.target.style.visibility = 'hidden' }}
      />
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{
          display: 'block', fontSize: 13,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {cluster.person_name || 'Unknown'}
        </span>
        <span style={{ fontSize: 11, color: C.muted }}>
          {cluster.size.toLocaleString()} {cluster.size === 1 ? 'face' : 'faces'}
        </span>
      </span>
    </button>
  )
}

function ClusterFaces({ cluster }) {
  const [detail, setDetail] = useState({ forId: null, data: null })
  const [open, setOpen] = useState(null)

  useEffect(() => {
    if (!cluster) return
    let alive = true
    getCluster(cluster.id)
      .then(d => { if (alive) setDetail({ forId: cluster.id, data: d }) })
      .catch(() => {})
    return () => { alive = false }
  }, [cluster])

  if (!cluster) {
    return (
      <p style={{ fontSize: 13, color: C.muted, paddingTop: 8 }}>
        Choose somebody to see the faces attached to them.
      </p>
    )
  }

  const ready = detail.forId === cluster.id
  const faces = ready ? detail.data?.faces || [] : null

  return (
    <div>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Avatar
          name={cluster.person_name || '?'}
          src={cluster.person_avatar ? mediaUrl(cluster.person_avatar) : null}
          size={34}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14 }}>{cluster.person_name || 'Unknown'}</div>
          <div style={{ fontSize: 11.5, color: C.muted }}>
            {cluster.size.toLocaleString()} faces in this group
          </div>
        </div>
        {cluster.person_id && (
          <Link
            to={`/v2/people/${cluster.person_id}`}
            style={{ fontSize: 12.5, color: C.activeText, textDecoration: 'none' }}
          >
            Their page →
          </Link>
        )}
      </header>

      {faces === null ? <LoadingDots /> : (
        <div style={{
          display: 'grid', gap: 6,
          gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))',
        }}>
          {faces.map((f, i) => (
            <button
              key={f.crop_url || i}
              type="button"
              onClick={() => setOpen(f)}
              title={f.photo_path}
              style={{
                aspectRatio: '1 / 1', padding: 0, border: 0, borderRadius: 6,
                overflow: 'hidden', background: C.hover, cursor: 'pointer',
              }}
            >
              {/* The cluster endpoint hands back a ready URL, not a path —
                  putting it through mediaUrl produced /api/media/undefined. */}
              <img
                src={f.crop_url}
                alt=""
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </button>
          ))}
        </div>
      )}

      {open && (
        <MediaDetail
          item={{
            path: open.photo_path,
            url: mediaUrl(open.photo_path),
            thumbnail_url: open.crop_url,
            filename: (open.photo_path || '').split('/').pop(),
          }}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}

const more = {
  width: '100%', marginTop: 8, height: 32, borderRadius: 16, fontSize: 12.5,
  border: `1px solid ${C.border}`, background: 'transparent',
  color: C.text, cursor: 'pointer',
}

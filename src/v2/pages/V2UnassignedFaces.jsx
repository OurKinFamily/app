import { useState } from 'react'
import { ClusterRail } from '../ui/faces/ClusterRail'
import { CropGrid } from '../ui/faces/CropGrid'
import { AssignBar } from '../ui/faces/AssignBar'
import { MediaDetail } from '../ui/MediaDetail'
import { useClusterQueue } from '../lib/useClusterQueue'
import { useClusterAssign } from '../lib/useClusterAssign'
import { isVideo, mediaUrl } from '../../lib/media'
import { C } from '../ui/tokens'

/**
 * Putting names to the faces the archive has grouped but cannot identify.
 *
 * The queue is down the left and the group you are working on fills the rest.
 * Nothing about a group is claimed except that these faces look alike — the
 * naming is entirely yours, and a group is very often two people, which is why
 * the crosses matter as much as the names.
 */
export function V2UnassignedFaces() {
  const queue = useClusterQueue()
  const [photo, setPhoto] = useState(null)

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 116px)', margin: '-4px -4px 0' }}>
      <ClusterRail
        clusters={queue.clusters}
        selected={queue.selected}
        onSelect={queue.setSelected}
        loading={queue.loading}
        loadingMore={queue.loadingMore}
        hasMore={queue.hasMore}
        onMore={queue.loadMore}
      />

      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '0 16px' }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 10,
          padding: '4px 0 10px', flexWrap: 'wrap',
        }}>
          <h1 style={{ fontSize: 22, fontWeight: 400, margin: 0 }}>Who are these?</h1>
          {!queue.loading && (
            <span style={{ fontSize: 12.5, color: C.muted }}>
              {queue.total.toLocaleString()} groups still unnamed
            </span>
          )}
        </div>

        {queue.selected
          ? (
            <Group
              key={queue.selected.id}
              cluster={queue.selected}
              quickPeople={queue.quickPeople}
              onAssigned={queue.drain}
              onSkipped={queue.remove}
              onOpenPhoto={setPhoto}
            />
          )
          : (
            <p style={{ fontSize: 13, color: C.muted }}>
              Pick a face from the left to start.
            </p>
          )}
      </main>

      {photo && (
        <MediaDetail
          item={{
            path: photo,
            url: mediaUrl(photo),
            is_video: isVideo(photo),
            thumbnail_url: isVideo(photo) ? mediaUrl(`${photo}.poster.jpg`) : mediaUrl(photo),
            filename: photo.split('/').pop(),
          }}
          onClose={() => setPhoto(null)}
        />
      )}
    </div>
  )
}

function Group({ cluster, quickPeople, onAssigned, onSkipped, onOpenPhoto }) {
  const assign = useClusterAssign(cluster, { onAssigned, onSkipped })

  const openPhoto = path => onOpenPhoto(
    path.startsWith('/photos/') ? path.slice('/photos/'.length) : path,
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 13 }}>
          {assign.detail
            ? (assign.remaining > 0
              ? `${assign.shown.toLocaleString()} of ${assign.faces.length.toLocaleString()} faces`
              : `${assign.faces.length.toLocaleString()} ${assign.faces.length === 1 ? 'face' : 'faces'}`)
            : 'Loading the group…'}
        </span>

        {assign.excluded.size > 0 && (
          <>
            <span style={{
              padding: '2px 9px', borderRadius: 999, fontSize: 11,
              background: '#fce8e6', color: '#c5221f',
            }}>
              {assign.excluded.size} crossed out
            </span>
            <button type="button" onClick={assign.clearExcluded} style={link}>
              Put them back
            </button>
          </>
        )}

        <div style={{ flex: 1 }} />

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.muted }}>
          Show
          <select
            value={assign.batch}
            onChange={e => assign.setBatch(Number(e.target.value))}
            style={{
              height: 28, padding: '0 8px', borderRadius: 8,
              border: `1px solid ${C.border}`, background: C.bg,
              font: 'inherit', fontSize: 12, color: C.text, cursor: 'pointer',
            }}
          >
            {[100, 200, 300, 400, 500].map(n => (
              <option key={n} value={n}>{n} at a time</option>
            ))}
          </select>
        </label>
      </div>

      {assign.detail
        ? (
          <CropGrid
            faces={assign.visible}
            excluded={assign.excluded}
            onToggle={assign.toggle}
            onOpen={openPhoto}
          />
        )
        : (
          <div style={{
            display: 'grid', gap: 5,
            gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
          }}>
            {(cluster.samples || []).map(url => (
              <img
                key={url}
                src={url}
                alt=""
                loading="lazy"
                style={{
                  width: '100%', aspectRatio: '1', objectFit: 'cover',
                  borderRadius: 8, background: C.hover,
                }}
              />
            ))}
          </div>
        )}

      {assign.remaining > 0 && (
        <button type="button" onClick={assign.showMore} style={more}>
          Show {Math.min(assign.batch, assign.remaining).toLocaleString()} more
          — {assign.remaining.toLocaleString()} behind them
        </button>
      )}

      <div style={{ flex: 1 }} />
      <AssignBar assign={assign} quickPeople={quickPeople} />
    </div>
  )
}

const link = {
  border: 0, background: 'transparent', color: C.activeText,
  fontSize: 12, cursor: 'pointer', padding: 0,
}
const more = {
  width: '100%', height: 32, borderRadius: 16, fontSize: 12.5, marginTop: 10,
  border: `1px solid ${C.border}`, background: 'transparent',
  color: C.text, cursor: 'pointer',
}

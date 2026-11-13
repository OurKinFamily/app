import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Album, Lock, Plus } from 'lucide-react'
import { CollectionCard } from '../ui/CollectionCard'
import { NewAlbumDialog } from '../ui/NewAlbumDialog'
import { LoadingDots } from '../ui/LoadingDots'
import { C } from '../ui/tokens'
import { albumSubtitle, kindLabel, kindBadge } from '../lib/albumKind'

/**
 * Albums.
 *
 * The first page built on CollectionCard, and the reason the card takes its
 * words as props rather than knowing what an album is: Scrapbook and a
 * person's collections come next and differ only in what they pass.
 *
 * Covers come from the medium endpoint rather than the thumbnail one. An album
 * cover is shown three times the size of a grid tile, and a 400px thumbnail
 * stretched to 300 wide is visibly soft.
 */

const mediumUrl = path => `/api/media/medium/${path}`

export function AlbumsPage() {
  const navigate = useNavigate()
  const [albums, setAlbums] = useState(null)
  const [creating, setCreating] = useState(false)
  const [kind, setKind] = useState(null)        // null = everything

  const load = useCallback(() => {
    fetch('/api/albums/')
      .then(r => (r.ok ? r.json() : []))
      .then(rows => setAlbums(Array.isArray(rows) ? rows : []))
      .catch(() => setAlbums([]))
  }, [])

  useEffect(() => { load() }, [load])

  // Chips are built from what is actually here, so a kind with no albums
  // never offers an empty filter.
  const kinds = useMemo(() => {
    const n = new Map()
    for (const a of albums || []) n.set(a.kind || 'manual', (n.get(a.kind || 'manual') || 0) + 1)
    return [...n.entries()].sort((x, y) => y[1] - x[1])
  }, [albums])

  const shown = useMemo(
    () => (kind ? (albums || []).filter(a => (a.kind || 'manual') === kind) : albums),
    [albums, kind],
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 20px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, margin: 0 }}>Albums</h1>
        {albums?.length > 0 && (
          <span style={{ fontSize: 13, color: C.muted }}>{shown?.length ?? albums.length}</span>
        )}
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => setCreating(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            height: 34, padding: '0 14px', borderRadius: 17,
            border: `1px solid ${C.border}`, background: 'transparent',
            color: C.text, fontSize: 13, cursor: 'pointer',
          }}
        >
          <Plus size={15} /> New album
        </button>
      </div>

      {kinds.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '0 0 18px' }}>
          <KindChip label="All" count={albums?.length || 0}
                    on={kind === null} onClick={() => setKind(null)} />
          {kinds.map(([k, n]) => (
            <KindChip key={k} label={kindLabel(k)} count={n}
                      on={kind === k} onClick={() => setKind(kind === k ? null : k)} />
          ))}
        </div>
      )}

      {albums === null && <LoadingDots />}

      {albums?.length === 0 && (
        <p style={{ color: C.muted, fontSize: 14, padding: '48px 0', textAlign: 'center' }}>
          No albums yet. An album is a handful of photographs kept together
          because they belong together — a holiday, a person, a year.
        </p>
      )}

      {shown?.length > 0 && (
        <div style={{
          display: 'grid', gap: 20,
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        }}>
          {shown.map(a => (
            <CollectionCard
              key={a.id}
              title={a.name}
              subtitle={albumSubtitle(a)}
              badge={kindBadge(a.kind)}
              description={a.description}
              count={a.item_count}
              countLabel="photo"
              cover={a.cover_path ? mediumUrl(a.cover_path) : null}
              coverAlt=""
              icon={a.is_private ? Lock : Album}
              onClick={() => navigate(`/albums/${a.id}`)}
            />
          ))}
        </div>
      )}

      {creating && (
        <NewAlbumDialog
          onClose={() => setCreating(false)}
          onCreated={id => { load(); navigate(`/albums/${id}`) }}
        />
      )}
    </div>
  )
}

/**
 * One filter. Deliberately the same shape as the search pill elsewhere on the
 * page rather than a new control: the list is long enough that filtering is
 * the normal way to use it, not an advanced feature.
 */
function KindChip({ label, count, on, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        height: 30, padding: '0 12px', borderRadius: 15, cursor: 'pointer',
        border: `1px solid ${on ? C.text : C.border}`,
        background: on ? C.text : 'transparent',
        color: on ? C.surface : C.text,
        fontSize: 13,
      }}
    >
      {label}
      <span style={{ fontSize: 11.5, opacity: 0.65 }}>{count}</span>
    </button>
  )
}

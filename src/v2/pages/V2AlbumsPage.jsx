import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Album, Lock, Plus } from 'lucide-react'
import { CollectionCard } from '../ui/CollectionCard'
import { NewAlbumDialog } from '../ui/NewAlbumDialog'
import { LoadingDots } from '../ui/LoadingDots'
import { C } from '../ui/tokens'

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

export function V2AlbumsPage() {
  const navigate = useNavigate()
  const [albums, setAlbums] = useState(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(() => {
    fetch('/api/albums/')
      .then(r => (r.ok ? r.json() : []))
      .then(rows => setAlbums(Array.isArray(rows) ? rows : []))
      .catch(() => setAlbums([]))
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 20px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, margin: 0 }}>Albums</h1>
        {albums?.length > 0 && (
          <span style={{ fontSize: 13, color: C.muted }}>{albums.length}</span>
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

      {albums === null && <LoadingDots />}

      {albums?.length === 0 && (
        <p style={{ color: C.muted, fontSize: 14, padding: '48px 0', textAlign: 'center' }}>
          No albums yet. An album is a handful of photographs kept together
          because they belong together — a holiday, a person, a year.
        </p>
      )}

      {albums?.length > 0 && (
        <div style={{
          display: 'grid', gap: 20,
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        }}>
          {albums.map(a => (
            <CollectionCard
              key={a.id}
              title={a.name}
              subtitle={a.is_private ? 'Private' : 'Shared'}
              description={a.description}
              count={a.item_count}
              countLabel="photo"
              cover={a.cover_path ? mediumUrl(a.cover_path) : null}
              coverAlt=""
              icon={a.is_private ? Lock : Album}
              onClick={() => navigate(`/v2/albums/${a.id}`)}
            />
          ))}
        </div>
      )}

      {creating && (
        <NewAlbumDialog
          onClose={() => setCreating(false)}
          onCreated={id => { load(); navigate(`/v2/albums/${id}`) }}
        />
      )}
    </div>
  )
}

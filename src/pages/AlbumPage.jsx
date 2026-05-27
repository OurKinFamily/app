import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Lock, Album, Trash2, Pencil } from 'lucide-react'
import { Container } from '../components/Container'
import { Tag } from '../components/Tag'
import { Button } from '../components/Button'
import { Media } from '../components/Media'
import { MediaLightbox } from '../components/MediaLightbox'
import { MediaDetail } from '../components/MediaDetail'
import { useFavorites } from '../lib/useFavorites'

export function AlbumPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [album, setAlbum] = useState(null)
  const [error, setError] = useState(null)
  const [viewer, setViewer] = useState(null)
  const { favs, toggle: toggleFav } = useFavorites()

  function load() {
    fetch(`/api/albums/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setAlbum)
      .catch(e => setError(String(e)))
  }

  useEffect(load, [id])

  async function removeFromAlbum(path) {
    await fetch(`/api/albums/${id}/media?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
    load()
    setViewer(null)
  }

  async function deleteAlbum() {
    if (!confirm(`Delete album "${album.name}"? Photos inside are not affected.`)) return
    const res = await fetch(`/api/albums/${id}`, { method: 'DELETE' })
    if (res.ok) navigate('/gallery/albums')
    else alert('Failed to delete')
  }

  if (error) return <Container className="py-6"><p className="text-[13px] text-red-400">Album not found.</p></Container>
  if (!album) return <Container className="py-6"><p className="text-[13px] text-white/30">Loading…</p></Container>

  const items = album.items || []

  return (
    <Container className="py-6">
      <Link to="/gallery/albums" className="text-[12px] text-white/40 hover:text-white/70">← Albums</Link>

      <div className="mt-3 mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-white">{album.name}</h1>
            {album.is_private
              ? <Tag tone="slate"><Lock size={10} className="-mt-0.5 mr-1 inline" />Private</Tag>
              : <Tag tone="green"><Album size={10} className="-mt-0.5 mr-1 inline" />Shared</Tag>}
            <Tag tone="amber">{album.total} photo{album.total === 1 ? '' : 's'}</Tag>
          </div>
          {album.description && <p className="mt-1 text-[13px] text-white/50">{album.description}</p>}
          {album.created_by_name && (
            <p className="mt-1 text-[11px] text-white/30">Created by {album.created_by_name}</p>
          )}
        </div>
        <Button size="sm" variant="secondary" onClick={deleteAlbum} className="border-red-500/30 text-red-300 hover:bg-red-500/10">
          <Trash2 size={14} /> Delete
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-[13px] text-white/30">No photos yet. Use the &ldquo;Add to album&rdquo; action in any lightbox to add some.</p>
      )}

      {items.length > 0 && (
        <div className="grid gap-1 [grid-template-columns:repeat(auto-fill,minmax(160px,1fr))]">
          {items.map((it, i) => (
            <div key={it.path} className="aspect-square">
              <Media
                thumb={it.thumbnail_url}
                isVideo={it.is_video}
                color={it.dominant_color}
                favorited={favs.has(it.path)}
                onFavorite={() => toggleFav(it)}
                onClick={() => setViewer(i)}
              />
            </div>
          ))}
        </div>
      )}

      {viewer !== null && items[viewer] && (
        <MediaLightbox
          items={items}
          initialIndex={viewer}
          favorites={favs}
          onFavorite={toggleFav}
          onDelete={() => removeFromAlbum(items[viewer].path)}
          onClose={() => setViewer(null)}
          currentCoverPath={album.cover_is_explicit ? album.cover_path : null}
          onSetCover={async it => {
            await fetch(`/api/albums/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cover_path: it.path }),
            })
            setAlbum(a => ({ ...a, cover_path: it.path, cover_is_explicit: true }))
          }}
          renderDetail={(it, ctx, v) => <MediaDetail key={`${it.path}-${v}`} item={it} ctx={ctx} />}
        />
      )}
    </Container>
  )
}

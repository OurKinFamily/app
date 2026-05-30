import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Album, Lock } from 'lucide-react'
import { Container } from '../components/Container'
import { Tag } from '../components/Tag'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Label } from '../components/Label'
import { Drawer } from '../components/Drawer'
import { MediaCard } from '../components/MediaCard'
import { mediumUrl } from '../lib/media'

export function AlbumsPage() {
  const navigate = useNavigate()
  const [albums, setAlbums]     = useState(null)
  const [creating, setCreating] = useState(false)
  const [name, setName]         = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [saving, setSaving]     = useState(false)

  function load() {
    fetch('/api/albums/').then(r => r.ok ? r.json() : []).then(setAlbums).catch(() => setAlbums([]))
  }

  useEffect(load, [])

  async function create() {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/albums/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, is_private: isPrivate }),
      })
      if (res.ok) {
        const { id } = await res.json()
        navigate(`/gallery/albums/${id}`)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-medium text-white/80">Albums</h1>
          {albums && <Tag tone="amber">{albums.length}</Tag>}
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>+ New Album</Button>
      </div>

      {albums === null && <p className="text-[13px] text-white/30">Loading…</p>}
      {albums !== null && albums.length === 0 && (
        <p className="text-[13px] text-white/30">No albums yet. Click + New Album to start.</p>
      )}

      {albums && albums.length > 0 && (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
          {albums.map(a => (
            <MediaCard
              key={a.id}
              cover={a.cover_path ? mediumUrl(a.cover_path) : null}
              coverBadge={a.item_count > 0 ? `${a.item_count} photo${a.item_count === 1 ? '' : 's'}` : 'empty'}
              icon={a.is_private ? <Lock size={13} /> : <Album size={13} />}
              text={a.name}
              subtitle={a.is_private ? 'Private' : 'Shared'}
              description={a.description}
              onClick={() => navigate(`/gallery/albums/${a.id}`)}
            />
          ))}
        </div>
      )}

      <Drawer open={creating} onClose={() => setCreating(false)} title="New Album">
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Christmas 2024" autoFocus />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="(optional)" />
          </div>
          <label className="flex items-center gap-2 text-[13px] text-white/70">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={e => setIsPrivate(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-blue-500"
            />
            Private (only you see it)
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="secondary" onClick={() => setCreating(false)} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={create} disabled={saving || !name.trim()}>
              {saving ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </div>
      </Drawer>
    </Container>
  )
}

import { useEffect, useState } from 'react'
import { X, Album, Lock, Plus } from 'lucide-react'
import { Button } from './Button'
import { Input } from './Input'

// "Add to album" picker. Shows existing albums and a "New album" form.
// `paths` is the list of media paths to add (single-item or bulk).
export function AlbumPicker({ paths, onClose, onAdded }) {
  const [albums, setAlbums] = useState(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch('/api/albums/').then(r => r.ok ? r.json() : []).then(setAlbums).catch(() => setAlbums([]))
  }, [])

  async function addTo(albumId) {
    setBusy(true)
    try {
      await fetch(`/api/albums/${albumId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths }),
      })
      onAdded?.(albumId, paths.length)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  async function createAndAdd() {
    if (!newName.trim() || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/albums/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (res.ok) {
        const { id } = await res.json()
        await fetch(`/api/albums/${id}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths }),
        })
        onAdded?.(id, paths.length)
        onClose()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/75 p-4" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-950"
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-white/10 p-3">
          <h2 className="flex-1 text-sm font-medium text-white/85">
            Add {paths.length === 1 ? 'photo' : `${paths.length} photos`} to album
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {albums === null && <p className="text-[13px] text-white/30">Loading…</p>}
          {albums !== null && (
            <div className="space-y-1">
              {albums.map(a => (
                <button
                  key={a.id}
                  disabled={busy}
                  onClick={() => addTo(a.id)}
                  className="flex w-full items-center gap-3 rounded-lg border border-white/8 bg-white/3 px-3 py-2 text-left transition-colors hover:border-white/15 hover:bg-white/8 disabled:opacity-50"
                >
                  {a.is_private ? <Lock size={14} className="text-white/40" /> : <Album size={14} className="text-white/40" />}
                  <span className="flex-1 truncate text-[13px] text-white/85">{a.name}</span>
                  <span className="text-[11px] text-white/30">{a.item_count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-white/10 p-3">
          {creating ? (
            <div className="space-y-2">
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createAndAdd()}
                placeholder="New album name…"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setCreating(false)} disabled={busy}>Cancel</Button>
                <Button size="sm" onClick={createAndAdd} disabled={busy || !newName.trim()}>
                  {busy ? 'Creating…' : 'Create & add'}
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setCreating(true)} className="w-full">
              <Plus size={14} /> New album
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

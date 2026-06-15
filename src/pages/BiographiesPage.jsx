import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookText, Lock, Unlock } from 'lucide-react'
import { mediumUrl, mediaUrl } from '../lib/media'
import { Container } from '../components/Container'
import { useIsAdmin } from '../contexts/MeContext'

// Index of everyone who has a written biography. Tiles link straight to the
// person's Biography tab. Tile image = cover photo if set, else avatar.
export function BiographiesPage() {
  const isAdmin = useIsAdmin()
  const [people, setPeople] = useState(null)

  useEffect(() => {
    fetch('/api/people/with-biography')
      .then(r => (r.ok ? r.json() : []))
      .then(setPeople)
      .catch(() => setPeople([]))
  }, [])

  // Owner-only: hide/show a person's bio from family viewers, straight from the card.
  async function toggleBioPrivate(p) {
    const next = !p.bio_private
    try {
      const res = await fetch(`/api/people/${p.id}/bio-private`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio_private: next }),
      })
      if (!res.ok) return
      setPeople(list => list.map(x => (x.id === p.id ? { ...x, bio_private: next } : x)))
    } catch { /* leave state unchanged on failure */ }
  }

  return (
    <Container className="py-8">
      <h1 className="mb-1 text-2xl font-semibold text-white">Biographies</h1>
      <p className="mb-6 text-[13px] text-white/40">
        The people whose stories have been written down.
      </p>

      {people === null ? (
        <p className="text-white/40">Loading…</p>
      ) : people.length === 0 ? (
        <p className="text-white/40">No biographies yet.</p>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
          {people.map(p => (
            <BioTile key={p.id} p={p} isAdmin={isAdmin} onTogglePrivate={() => toggleBioPrivate(p)} />
          ))}
        </div>
      )}
    </Container>
  )
}

function lifespan(p) {
  const y = d => (d ? String(d).slice(0, 4) : '')
  const b = y(p.birth_date)
  const d = y(p.death_date)
  if (b && d) return `${b}–${d}`
  if (b) return `b. ${b}`
  return ''
}

function BioTile({ p, isAdmin, onTogglePrivate }) {
  const img = p.cover_image ? mediumUrl(p.cover_image) : p.avatar ? mediaUrl(p.avatar) : null
  const span = lifespan(p)
  return (
    <Link
      to={`/manage/people/${p.id}/biography`}
      className={`group block overflow-hidden rounded-xl border bg-zinc-900 transition-colors hover:border-white/25 ${p.bio_private ? 'border-amber-400/30' : 'border-white/10'}`}
    >
      <div className="relative aspect-[4/3] bg-zinc-800">
        {isAdmin && (
          <button
            type="button"
            onClick={e => { e.preventDefault(); e.stopPropagation(); onTogglePrivate() }}
            title={p.bio_private
              ? 'Private — only you can read this. Click to make it visible to family.'
              : 'Visible to family. Click to make private (only you).'}
            aria-label={p.bio_private ? 'Make biography public' : 'Make biography private'}
            className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1.5 backdrop-blur transition hover:bg-black/80"
          >
            {p.bio_private
              ? <Lock size={14} className="text-amber-400" />
              : <Unlock size={14} className="text-white/60" />}
          </button>
        )}
        {img ? (
          <img
            src={img}
            alt={p.known_as || p.name}
            loading="lazy"
            className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/20">
            <BookText size={32} />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      </div>
      <div className="p-3">
        <p className="truncate text-[14px] font-medium text-white">{p.known_as || p.name}</p>
        {span && <p className="mt-0.5 text-[12px] text-white/45">{span}</p>}
      </div>
    </Link>
  )
}

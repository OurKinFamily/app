import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookText } from 'lucide-react'
import { mediumUrl, mediaUrl } from '../lib/media'
import { Container } from '../components/Container'

// Index of everyone who has a written biography. Tiles link straight to the
// person's Biography tab. Tile image = cover photo if set, else avatar.
export function BiographiesPage() {
  const [people, setPeople] = useState(null)

  useEffect(() => {
    fetch('/api/people/with-biography')
      .then(r => (r.ok ? r.json() : []))
      .then(setPeople)
      .catch(() => setPeople([]))
  }, [])

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
            <BioTile key={p.id} p={p} />
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

function BioTile({ p }) {
  const img = p.cover_image ? mediumUrl(p.cover_image) : p.avatar ? mediaUrl(p.avatar) : null
  const span = lifespan(p)
  return (
    <Link
      to={`/manage/people/${p.id}/biography`}
      className="group block overflow-hidden rounded-xl border border-white/10 bg-zinc-900 transition-colors hover:border-white/25"
    >
      <div className="relative aspect-[4/3] bg-zinc-800">
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

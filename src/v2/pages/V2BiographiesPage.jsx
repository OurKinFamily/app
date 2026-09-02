import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Lock, Unlock } from 'lucide-react'
import { CollectionCard } from '../ui/CollectionCard'
import { LoadingDots } from '../ui/LoadingDots'
import { lifespan } from '../lib/lifespan'
import { displayName } from '../../lib/people'
import { mediaUrl, mediumUrl } from '../../lib/media'
import { useIsAdmin } from '../../contexts/MeContext'
import { C } from '../ui/tokens'

/**
 * The people whose stories have been written down.
 *
 * Built on the same card as Albums, which is what that card was for: a written
 * life is a container of things too, and it belongs in a grid that looks like
 * the rest of the archive rather than inventing its own tile.
 *
 * No stack behind the cover, though. An album holds many photographs and says
 * so; a biography is one piece of writing about one person.
 */

export function V2BiographiesPage() {
  const navigate = useNavigate()
  const isAdmin = useIsAdmin()
  const [people, setPeople] = useState(null)

  useEffect(() => {
    fetch('/api/people/with-biography')
      .then(r => (r.ok ? r.json() : []))
      .then(rows => setPeople(Array.isArray(rows) ? rows : []))
      .catch(() => setPeople([]))
  }, [])

  // Owner-only, from the card: whether family can read this one at all.
  const togglePrivate = useCallback(async person => {
    const next = !person.bio_private
    const res = await fetch(`/api/people/${person.id}/bio-private`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bio_private: next }),
    })
    if (!res.ok) return
    setPeople(list => list.map(p => (p.id === person.id ? { ...p, bio_private: next } : p)))
  }, [])

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 400, margin: '4px 0 4px' }}>Biographies</h1>
      <p style={{ fontSize: 13, color: C.muted, margin: '0 0 20px' }}>
        The people whose stories have been written down.
        {people?.length ? ` ${people.length} so far.` : ''}
      </p>

      {people === null && <LoadingDots />}

      {people?.length === 0 && (
        <p style={{ color: C.muted, fontSize: 14, padding: '48px 0', textAlign: 'center' }}>
          No biographies yet.
        </p>
      )}

      {people?.length > 0 && (
        <div style={{
          display: 'grid', gap: 14,
          gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
        }}>
          {people.map(p => (
            <CollectionCard
              key={p.id}
              title={displayName(p)}
              subtitle={lifespan(p) || undefined}
              cover={p.cover_image ? mediumUrl(p.cover_image)
                : p.avatar ? mediaUrl(p.avatar) : null}
              coverAlt=""
              icon={BookOpen}
              stacked={false}
              onClick={() => navigate(`/v2/people/${p.id}/biography`)}
            >
              {isAdmin && (
                <CollectionCard.Actions>
                  <button
                    type="button"
                    onClick={() => togglePrivate(p)}
                    aria-label={p.bio_private
                      ? `Let family read ${displayName(p)}'s story`
                      : `Keep ${displayName(p)}'s story to yourself`}
                    title={p.bio_private
                      ? 'Only you can read this. Click to let family read it.'
                      : 'Family can read this. Click to keep it to yourself.'}
                    style={{
                      display: 'grid', placeItems: 'center', width: 28, height: 28,
                      borderRadius: '50%', border: 0, cursor: 'pointer',
                      background: 'rgba(0,0,0,.55)',
                      color: p.bio_private ? '#fdd663' : '#fff',
                    }}
                  >
                    {p.bio_private ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                </CollectionCard.Actions>
              )}
            </CollectionCard>
          ))}
        </div>
      )}
    </div>
  )
}

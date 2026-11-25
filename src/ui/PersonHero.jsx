import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar } from './Avatar'
import { lifespan } from '../lib/lifespan'
import { mediaUrl, thumbUrl } from '../lib/media'
import { displayName } from '../lib/people'
import { useRelationship } from '../lib/useRelationship'
import { usePersonStats } from '../lib/usePersonStats'

/**
 * The top of a person's page.
 *
 * v1 showed one cover photograph, chosen by hand. One frame has to stand for a
 * whole life, and on this archive that frame is usually a soft video still with
 * somebody's head cropped off. So the hero is now a mosaic of their faces
 * across the years — the thing this archive has that nothing else does. It
 * needs no curation, it is different on every person, and it degrades
 * gracefully: fewer photographs, fewer tiles.
 *
 * The mosaic is blurred and dimmed into texture so the name stays legible over
 * it, with a horizontal gradient that is darkest at the centre and clears at
 * both edges — the outer faces stay bright, the words sit on a dark core.
 *
 * There is no "change cover" control any more; there is nothing to choose.
 * The portrait is still chosen by hand, so the pencil lives on the avatar.
 */

// Tuned against real photographs rather than picked from a palette.
const BLUR = '2.2px'
const BASE_DIM = 0.62      // flat wash over the whole mosaic
const CENTRE_DIM = 0.68    // extra darkness behind the words
const BRIGHTNESS = 0.88
const SATURATION = 0.85

const TILES = 15           // 5 x 3

export function PersonHero({ person, photos, isAdmin, onPickAvatar }) {
  const [overAvatar, setOverAvatar] = useState(false)
  const relationship = useRelationship(person.id)
  const stats = usePersonStats(person.id)
  const tiles = spread(photos, TILES)
  const years = lifespan(person)

  const facts = [
    years,
    person.maiden_name ? `née ${person.maiden_name}` : null,
    person.birth_place,
  ].filter(Boolean).join(' · ')

  const figures = stats ? [
    stats.photos > 0 && { label: 'Photographs', value: stats.photos },
    stats.videos > 0 && { label: 'Videos', value: stats.videos },
    stats.ancestors > 0 && { label: 'Ancestors', value: stats.ancestors, to: 'ancestry' },
    stats.collections > 0 && { label: 'Collections', value: stats.collections, to: 'scrapbook' },
    stats.groups > 0 && { label: 'Groups', value: stats.groups, to: 'circles' },
  ].filter(Boolean) : []

  return (
    <header style={{
      position: 'relative', borderRadius: '14px 14px 0 0', overflow: 'hidden',
      marginBottom: 18, background: '#0b0d10', minHeight: 300,
    }}>
      {tiles.length > 0 && (
        <div aria-hidden style={{
          position: 'absolute', inset: 0, display: 'grid', gap: 2,
          gridTemplateColumns: `repeat(${columnsFor(tiles.length)}, 1fr)`,
          gridAutoRows: '1fr',
        }}>
          {tiles.map(path => (
            <img
              key={path}
              src={thumbUrl(path)}
              alt=""
              loading="lazy"
              style={{
                width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                filter: `saturate(${SATURATION}) brightness(${BRIGHTNESS})`,
              }}
            />
          ))}
        </div>
      )}

      {/* Darkest behind the words, clear at the edges. */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        backdropFilter: `blur(${BLUR})`, WebkitBackdropFilter: `blur(${BLUR})`,
        background: [
          `linear-gradient(to right,
             rgba(0,0,0,0) 0%,
             rgba(0,0,0,${CENTRE_DIM * 0.45}) 18%,
             rgba(0,0,0,${CENTRE_DIM}) 50%,
             rgba(0,0,0,${CENTRE_DIM * 0.45}) 82%,
             rgba(0,0,0,0) 100%)`,
          `rgba(6,8,11,${BASE_DIM})`,
        ].join(','),
      }} />

      <div style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: '34px 24px 30px', color: '#fff', gap: 0,
      }}>
        <span
          style={{ position: 'relative', lineHeight: 0, marginBottom: 14 }}
          onMouseEnter={() => setOverAvatar(true)}
          onMouseLeave={() => setOverAvatar(false)}
        >
          <span style={{
            display: 'block', borderRadius: '50%', lineHeight: 0,
            border: '3px solid rgba(255,255,255,.9)',
            boxShadow: '0 2px 14px rgba(0,0,0,.5)',
          }}>
            <Avatar
              name={person.name}
              src={person.avatar ? mediaUrl(person.avatar) : null}
              size={92}
            />
          </span>
          {isAdmin && (
            <button
              type="button"
              onClick={onPickAvatar}
              onFocus={() => setOverAvatar(true)}
              onBlur={() => setOverAvatar(false)}
              aria-label="Change portrait"
              title="Change portrait"
              style={{
                position: 'absolute', right: -2, bottom: 2,
                display: 'grid', placeItems: 'center', width: 28, height: 28,
                borderRadius: '50%', border: '2px solid rgba(255,255,255,.9)',
                background: 'rgba(20,22,26,.92)', color: '#fff', cursor: 'pointer',
                // Hidden until wanted, but never removed from the tree: a
                // keyboard user still tabs to it, and focus brings it back.
                opacity: overAvatar ? 1 : 0,
                transition: 'opacity .14s ease',
              }}
            >
              <Pencil size={12} />
            </button>
          )}
        </span>

        {relationship && (
          <div style={{
            fontSize: 11.5, letterSpacing: '.14em', textTransform: 'uppercase',
            opacity: 0.8, marginBottom: 6,
          }}>
            {relationship}
          </div>
        )}

        <h1 style={{
          fontSize: 40, fontWeight: 600, margin: 0, lineHeight: 1,
          letterSpacing: '-0.8px', textShadow: '0 2px 18px rgba(0,0,0,.45)',
        }}>
          {displayName(person)}
        </h1>

        {facts && (
          <div style={{ fontSize: 14, opacity: 0.85, marginTop: 7 }}>{facts}</div>
        )}

        {figures.length > 0 && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
            gap: 34, marginTop: 22,
          }}>
            {figures.map(f => {
              const body = (
                <>
                  <span style={{
                    display: 'block', fontSize: 20, fontWeight: 600, lineHeight: 1.2,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {f.value.toLocaleString()}
                  </span>
                  <span style={{
                    display: 'block', fontSize: 11, opacity: 0.72, marginTop: 2,
                    textTransform: 'uppercase', letterSpacing: '.07em',
                  }}>
                    {f.label}{f.detail ? ` · ${f.detail}` : ''}
                  </span>
                </>
              )
              return f.to
                ? (
                  <Link
                    key={f.label}
                    to={`../${f.to}`}
                    relative="path"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    {body}
                  </Link>
                )
                : <div key={f.label}>{body}</div>
            })}
          </div>
        )}
      </div>
    </header>
  )
}

/**
 * An even spread across the list rather than the first N, so the mosaic covers
 * a life instead of whichever month the API happened to return first.
 */
function spread(photos, want) {
  const all = (photos || []).filter(Boolean)
  if (all.length <= want) return all
  const step = all.length / want
  return Array.from({ length: want }, (_, i) => all[Math.floor(i * step)])
}

/** Keep the grid tidy for people with only a handful of photographs. */
function columnsFor(n) {
  if (n >= 15) return 5
  if (n >= 8) return 4
  if (n >= 3) return 3
  return n || 1
}

import { Pencil } from 'lucide-react'
import { Avatar } from './Avatar'
import { lifespan } from '../lib/lifespan'
import { mediaUrl, mediumUrl } from '../lib/media'
import { displayName } from '../lib/people'
import { C } from './tokens'

/**
 * The top of a person's page: their cover photograph, their face, their name.
 *
 * v1 laid the name over the photograph in white, under a heavy black gradient.
 * That works on a dark page and fights a light one — and it dims the
 * photograph to make room for words that would read better beneath it. So the
 * banner stays a banner and the name sits below it, in ink.
 *
 * `cover_position` is honoured as v1 set it: 'fit' shows the whole photograph
 * over a blurred enlargement of itself, the others crop to fill.
 */
export function PersonHero({ person, hero, isAdmin, onPickAvatar, onPickCover }) {
  const position = person.cover_position || 'fit'
  const fit = position === 'fit'
  const years = lifespan(person)

  return (
    <header style={{ marginBottom: 20 }}>
      <div style={{
        position: 'relative', height: 220, borderRadius: 14,
        overflow: 'hidden', background: C.hover,
      }}>
        {hero && (fit ? (
          <>
            <div style={{
              position: 'absolute', inset: 0, transform: 'scale(1.25)',
              backgroundImage: `url(${mediumUrl(hero)})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              filter: 'blur(24px)', opacity: 0.55,
            }} />
            <img
              src={mediumUrl(hero)}
              alt=""
              style={{
                position: 'absolute', inset: 0, margin: 'auto',
                maxHeight: '100%', maxWidth: '100%', objectFit: 'contain',
              }}
            />
          </>
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${mediumUrl(hero)})`,
            backgroundSize: 'cover', backgroundPosition: position,
          }} />
        ))}

        {isAdmin && (
          <button
            type="button"
            onClick={onPickCover}
            aria-label="Change cover photo"
            title="Change cover photo"
            style={overlayButton(12)}
          >
            <Pencil size={15} />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: -26, padding: '0 18px' }}>
        <span style={{
          position: 'relative', flex: '0 0 auto', borderRadius: '50%',
          padding: 3, background: C.bg, lineHeight: 0,
        }}>
          <Avatar
            name={person.name}
            src={person.avatar ? mediaUrl(person.avatar) : null}
            size={68}
          />
          {isAdmin && (
            <button
              type="button"
              onClick={onPickAvatar}
              aria-label="Change portrait"
              title="Change portrait"
              style={{
                position: 'absolute', right: 0, bottom: 2,
                display: 'grid', placeItems: 'center', width: 24, height: 24,
                borderRadius: '50%', border: `2px solid ${C.bg}`,
                background: C.surface, color: C.muted, cursor: 'pointer',
              }}
            >
              <Pencil size={11} />
            </button>
          )}
        </span>

        <div style={{ minWidth: 0, flex: 1, paddingBottom: 2 }}>
          <h1 style={{ fontSize: 24, fontWeight: 400, margin: 0, lineHeight: 1.2 }}>
            {displayName(person)}
          </h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>
            {[
              years,
              person.maiden_name ? `née ${person.maiden_name}` : null,
              person.birth_place,
            ].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>
    </header>
  )
}

const overlayButton = inset => ({
  position: 'absolute', top: inset, right: inset, zIndex: 2,
  display: 'grid', placeItems: 'center', width: 32, height: 32,
  borderRadius: '50%', border: 0, cursor: 'pointer',
  background: 'rgba(0,0,0,.5)', color: '#fff',
})

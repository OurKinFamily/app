import { Link } from 'react-router-dom'
import { Avatar } from './Avatar'
import { mediaUrl } from '../lib/media'
import { C } from './tokens'

/**
 * Who is in this album.
 *
 * An album of a holiday is largely a question of who was there, so the faces
 * belong at the top with the title rather than being something you work out
 * by scrolling. Counted across every photograph in the album, not just the
 * page on screen, so the row does not change as you page through.
 *
 * Round, and small. The first attempt reused the lightbox's `Face` in row
 * form: a 40px square crop with the appearance count printed underneath. At
 * the top of a page that read as a row of mugshots each wearing a stray
 * number. The count lives in the tooltip now, where it is available without
 * being shouted. `Avatar` also draws initials when somebody has no portrait,
 * rather than leaving an empty grey box.
 */
export function AlbumPeople({ people }) {
  if (!people?.length) return null
  return (
    <div
      style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}
      aria-label="People in this album"
    >
      {people.map(p => (
        <Link
          key={p.id || p.name}
          to={p.id ? `/people/${p.id}` : '#'}
          onClick={e => { if (!p.id) e.preventDefault() }}
          title={`${p.full_name || p.name} — ${p.appearances} ${p.appearances === 1 ? 'photograph' : 'photographs'}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '2px 10px 2px 3px', borderRadius: 999,
            border: `1px solid ${C.border}`, background: C.surface,
            textDecoration: 'none', color: C.text, fontSize: 12.5,
            lineHeight: 1.6, maxWidth: 190,
          }}
        >
          <Avatar name={p.name} src={p.avatar ? mediaUrl(p.avatar) : null} size={22} />
          <span style={{
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {p.name}
          </span>
        </Link>
      ))}
    </div>
  )
}

import { C } from './tokens'

/**
 * The pages and papers inside a scrapbook.
 *
 * Square tiles rather than the justified rows the gallery uses: these are
 * scans of documents, letters and yearbook pages, mostly the same shape and
 * mostly portrait, and justifying them produces a wall of identical rectangles
 * with no rhythm to it. A grid reads as "a box of papers", which is what it is.
 *
 * The caption matters more here than in the gallery. A photograph is legible
 * on sight; a page of somebody's address book is not, and "Page 14" or the
 * subject somebody wrote down is the only way to tell two apart.
 */
export function ScrapbookItems({ items, onOpen }) {
  if (!items?.length) return null

  return (
    <div style={{
      display: 'grid', gap: 10,
      gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))',
    }}>
      {items.map((item, i) => (
        <button
          key={item.path || i}
          type="button"
          onClick={() => onOpen(i)}
          title={caption(item) || undefined}
          style={{
            border: 0, background: 'none', padding: 0, cursor: 'pointer',
            textAlign: 'left', font: 'inherit',
          }}
        >
          <span style={{
            display: 'block', aspectRatio: '1 / 1', borderRadius: 8,
            overflow: 'hidden', background: C.hover,
            border: `1px solid ${C.border}`,
          }}>
            {item.thumbnail_url && (
              <img
                src={item.thumbnail_url}
                alt=""
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            )}
          </span>
          <span style={{
            display: 'block', fontSize: 11.5, color: C.text, marginTop: 5,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {caption(item)}
          </span>
          {secondary(item) && (
            <span style={{
              display: 'block', fontSize: 10.5, color: C.muted,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {secondary(item)}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

const caption = it =>
  it.context_subject
  || (it.page_number != null ? `Page ${it.page_number}` : null)
  || it.collection_name
  || 'Untitled'

const secondary = it =>
  [it.content_date, it.place_name].filter(Boolean).join(' · ')

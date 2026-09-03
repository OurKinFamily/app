import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { isVideo, mediaUrl, thumbUrl } from '../../lib/media'
import { C } from './tokens'

/**
 * Somebody's life, as they wrote it.
 *
 * The only long-form reading in the archive, so it is set like reading rather
 * than like an interface: a serif, a generous line height, and a measure that
 * stops around 68 characters. Everything else here is a control panel; this is
 * a page from a book.
 *
 * Photographs are written into the markdown as
 * `![caption](archive/bios/<name>/file.jpg)`. One on its own becomes a figure
 * with its caption beneath; two or more in the same paragraph become a small
 * grid, which is how you write "and here they all are" without leaving six
 * pictures stacked down the page.
 */
export function BiographyProse({ markdown }) {
  const [viewing, setViewing] = useState(null)

  useEffect(() => {
    if (!viewing) return
    const onKey = e => { if (e.key === 'Escape') setViewing(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewing])

  const components = {
    img({ src, alt }) {
      if (isVideo(src)) {
        return (
          <figure style={figure}>
            <video controls preload="metadata" src={mediaUrl(src)} style={media} />
            {alt && <figcaption style={caption}>{alt}</figcaption>}
          </figure>
        )
      }
      return (
        <figure style={figure}>
          <button
            type="button"
            onClick={() => setViewing({ src, alt })}
            aria-label="See this larger"
            style={{ border: 0, background: 'none', padding: 0, cursor: 'zoom-in', display: 'block', margin: '0 auto' }}
          >
            <img src={thumbUrl(src)} alt={alt || ''} loading="lazy" style={media} />
          </button>
          {alt && <figcaption style={caption}>{alt}</figcaption>}
        </figure>
      )
    },

    p({ node, children }) {
      const kids = node?.children || []
      const images = kids.filter(c => c.tagName === 'img')
      const meaningful = kids.filter(c => !(c.type === 'text' && !c.value.trim()))
      if (images.length >= 2 && meaningful.length === images.length) {
        return (
          <div style={{
            display: 'grid', gap: 6, margin: '24px 0',
            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
          }}>
            {images.map((c, i) => (
              <button
                key={i}
                type="button"
                title={c.properties.alt || ''}
                onClick={() => setViewing({ src: c.properties.src, alt: c.properties.alt })}
                style={{
                  border: 0, padding: 0, background: C.hover, borderRadius: 6,
                  overflow: 'hidden', cursor: 'zoom-in', aspectRatio: '1 / 1',
                }}
              >
                <img
                  src={thumbUrl(c.properties.src)}
                  alt={c.properties.alt || ''}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </button>
            ))}
          </div>
        )
      }
      return <p style={{ margin: '0 0 1.15em' }}>{children}</p>
    },

    h1: ({ children }) => <h1 style={heading(23)}>{children}</h1>,
    h2: ({ children }) => <h2 style={{ ...heading(18), marginTop: '1.8em' }}>{children}</h2>,
    h3: ({ children }) => <h3 style={{ ...heading(15.5), marginTop: '1.5em' }}>{children}</h3>,
    blockquote: ({ children }) => (
      <blockquote style={{
        margin: '1.4em 0', padding: '0 0 0 16px',
        borderLeft: `2px solid ${C.border}`, color: C.muted,
      }}>
        {children}
      </blockquote>
    ),
    a: ({ children, href }) => (
      <a href={href} style={{ color: C.activeText }}>{children}</a>
    ),
    hr: () => <hr style={{ margin: '2.2em 0', border: 0, borderTop: `1px solid ${C.border}` }} />,
  }

  return (
    <div style={{
      fontFamily: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
      fontSize: 16.5, lineHeight: 1.72, color: C.text, maxWidth: '68ch',
    }}>
      <ReactMarkdown components={components}>{markdown}</ReactMarkdown>

      {viewing && (
        <div
          onClick={() => setViewing(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1400, padding: 16,
            background: 'rgba(16,17,19,.94)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
          }}
        >
          <img
            src={mediaUrl(viewing.src)}
            alt={viewing.alt || ''}
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '86vh', maxWidth: '92vw', objectFit: 'contain' }}
          />
          {viewing.alt && (
            <p
              onClick={e => e.stopPropagation()}
              style={{
                color: 'rgba(255,255,255,.75)', fontSize: 13,
                maxWidth: '60ch', textAlign: 'center', margin: 0,
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              {viewing.alt}
            </p>
          )}
          <button
            type="button"
            onClick={() => setViewing(null)}
            aria-label="Close"
            style={{
              position: 'absolute', top: 16, right: 16,
              display: 'grid', placeItems: 'center', width: 38, height: 38,
              border: 0, borderRadius: '50%', cursor: 'pointer',
              background: 'rgba(255,255,255,.12)', color: '#fff',
            }}
          >
            <X size={19} />
          </button>
        </div>
      )}
    </div>
  )
}

const figure = { margin: '24px 0' }
const media = {
  display: 'block', margin: '0 auto', maxWidth: '100%', maxHeight: 320,
  borderRadius: 8, background: C.hover,
}
const caption = {
  marginTop: 6, textAlign: 'center', fontSize: 12.5, color: C.muted,
  fontFamily: 'system-ui, sans-serif',
}
const heading = size => ({
  fontSize: size, fontWeight: 600, color: C.text,
  margin: '0 0 .5em', lineHeight: 1.3,
})

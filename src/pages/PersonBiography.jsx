import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { Pencil, X } from 'lucide-react'
import { mediumUrl, mediaUrl, thumbUrl, isVideo } from '../lib/media'
import { cn } from '../lib/cn'
import { Button } from '../components/Button'
import { useIsAdmin } from '../contexts/MeContext'

// Biography tab. Renders the person's freeform markdown bio. Photos are written
// in the markdown as ![caption](archive/bios/<name>/file.jpg) and render as
// full-width figures in the natural flow (between paragraphs), caption beneath.
// Admins edit the raw markdown in place.
export function PersonBiography() {
  const { person, setPerson } = useOutletContext()
  const isAdmin = useIsAdmin()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(person.biography || '')
  const [saving, setSaving] = useState(false)
  const [lightbox, setLightbox] = useState(null) // { src, alt } | null

  useEffect(() => {
    if (!lightbox) return
    const onKey = e => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/people/${person.id}/biography`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ biography: draft }),
      })
      if (res.ok) {
        setPerson(p => ({ ...p, biography: draft }))
        setEditing(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const components = {
    // A single media item, kept small so the words stay prominent. Click an image
    // to view it large (lightbox). Videos render with controls.
    img({ src, alt }) {
      if (isVideo(src)) {
        return (
          <figure className="my-6">
            <video
              controls preload="metadata"
              className="mx-auto block max-h-[56vh] w-full max-w-xl rounded-lg border border-white/10 bg-black"
              src={mediaUrl(src)}
            />
            {alt && <figcaption className="mt-1.5 text-center text-[12px] leading-snug text-white/45">{alt}</figcaption>}
          </figure>
        )
      }
      return (
        <figure className="my-6">
          <button type="button" onClick={() => setLightbox({ src, alt })}
            className="mx-auto block cursor-zoom-in" aria-label="View larger">
            <img
              src={thumbUrl(src)}
              alt={alt || ''}
              loading="lazy"
              className="mx-auto block max-h-[300px] w-auto max-w-full rounded-lg border border-white/10 bg-zinc-900 transition-opacity hover:opacity-90"
            />
          </button>
          {alt && (
            <figcaption className="mt-1.5 text-center text-[12px] leading-snug text-white/45">{alt}</figcaption>
          )}
        </figure>
      )
    },
    // A paragraph that is ONLY images (2+) becomes a mini-gallery grid. Write a row
    // of images together in the markdown to group them: ![a](x) ![b](y) ![c](z)
    p({ node, children }) {
      const kids = node?.children || []
      const imgs = kids.filter(c => c.tagName === 'img')
      const meaningful = kids.filter(c => !(c.type === 'text' && !c.value.trim()))
      if (imgs.length >= 2 && meaningful.length === imgs.length) {
        return (
          <div className="my-6 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {imgs.map((c, i) => (
              <button key={i} type="button" title={c.properties.alt || ''}
                onClick={() => setLightbox({ src: c.properties.src, alt: c.properties.alt })}
                className="group block cursor-zoom-in">
                <img
                  src={thumbUrl(c.properties.src)}
                  alt={c.properties.alt || ''}
                  loading="lazy"
                  className="aspect-square w-full rounded-md border border-white/10 bg-zinc-900 object-cover transition-opacity group-hover:opacity-80"
                />
              </button>
            ))}
          </div>
        )
      }
      return <p>{children}</p>
    },
  }

  if (editing) {
    return (
      <div className="max-w-3xl space-y-3">
        <p className="text-[12px] text-white/40">
          Markdown. Drop photos inline with{' '}
          <code className="rounded bg-white/10 px-1">![caption](archive/bios/&lt;name&gt;/file.jpg)</code>{' '}
          — they float beside the text, alternating sides.
        </p>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={26}
          className="w-full rounded-lg border border-white/10 bg-zinc-950 p-3 font-mono text-[13px] leading-relaxed text-white/85"
          placeholder="Write the story…"
        />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" disabled={saving}
            onClick={() => { setDraft(person.biography || ''); setEditing(false) }}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative max-w-3xl">
      {isAdmin && (
        <button
          onClick={() => { setDraft(person.biography || ''); setEditing(true) }}
          aria-label="Edit biography"
          className="absolute right-0 top-0 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Pencil size={16} />
        </button>
      )}

      {person.biography ? (
        <div
          className={cn(
            'text-[15px] leading-relaxed text-white/80',
            '[&_h1]:mb-2 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-white',
            '[&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white',
            '[&_p]:mb-5',
            '[&_strong]:font-semibold [&_strong]:text-white [&_em]:text-white/70',
            '[&_a]:text-amber-300 [&_a]:underline',
            '[&_blockquote]:my-5 [&_blockquote]:border-l-2 [&_blockquote]:border-white/20 [&_blockquote]:pl-4 [&_blockquote]:text-white/55',
            '[&_ul]:mb-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1',
            '[&_hr]:my-8 [&_hr]:border-white/10',
          )}
        >
          <ReactMarkdown components={components}>{person.biography}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-white/40">
          No biography yet.{isAdmin && ' Click the pencil to write one.'}
        </p>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[1400] flex flex-col items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={mediaUrl(lightbox.src)}
            alt={lightbox.alt || ''}
            className="max-h-[88vh] max-w-[92vw] rounded-lg object-contain"
            onClick={e => e.stopPropagation()}
          />
          {lightbox.alt && (
            <p className="mt-3 max-w-2xl text-center text-[13px] text-white/70" onClick={e => e.stopPropagation()}>
              {lightbox.alt}
            </p>
          )}
          <button
            onClick={() => setLightbox(null)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  )
}

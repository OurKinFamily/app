import { useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Lock, Search, Unlock } from 'lucide-react'
import { CollectionCard } from '../ui/CollectionCard'
import { ScrapbookItems } from '../ui/ScrapbookItems'
import { LoadingDots } from '../ui/LoadingDots'
import { MediaDetail } from '../ui/MediaDetail'
import { collectionCount, matches, useScrapbook } from '../lib/useScrapbook'
import { mediaUrl } from '../lib/media'
import { useIsAdmin } from '../contexts/MeContext'
import { C } from '../ui/tokens'

/**
 * Somebody's scrapbook: the albums, journals and boxes of paper they own, and
 * whatever loose items are theirs.
 *
 * The open collection lives in the URL rather than in a stack, so a link into
 * the middle of somebody's yearbook works and Back means what it says.
 */
export function PersonScrapbook() {
  const { person } = useOutletContext()
  const { collectionId } = useParams()
  const navigate = useNavigate()
  const isAdmin = useIsAdmin()
  const [query, setQuery] = useState('')
  const [viewing, setViewing] = useState(null)

  const book = useScrapbook(person.id, collectionId)
  const base = `/people/${person.id}/scrapbook`

  if (book.loading) return <LoadingDots />

  // ── inside a collection ────────────────────────────────────────────────────
  if (collectionId) {
    const detail = book.openDetail
    const items = (book.openItems || []).filter(it =>
      matches([it.context_subject, it.content_date, it.place_name,
               it.description, it.transcription], query))
    const children = (detail?.children || []).filter(c =>
      matches([c.name, c.description, c.type], query))

    return (
      <div>
        <button type="button" onClick={() => navigate(base)} style={back}>
          <ArrowLeft size={14} /> Scrapbook
        </button>

        <header style={{ margin: '4px 0 14px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>
            {detail?.name || 'Collection'}
          </h2>
          {detail?.description && (
            <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0', maxWidth: '68ch' }}>
              {detail.description}
            </p>
          )}
        </header>

        <Filter value={query} onChange={setQuery} />

        {book.openLoading && <LoadingDots />}

        {children.length > 0 && (
          <div style={{ ...grid, marginBottom: 20 }}>
            {children.map(c => (
              <Card key={c.id} collection={c} onOpen={() => navigate(`${base}/${c.id}`)} />
            ))}
          </div>
        )}

        <ScrapbookItems items={items} onOpen={i => setViewing({ items, index: i })} />

        {!book.openLoading && !items.length && !children.length && (
          <p style={muted}>Nothing here matches.</p>
        )}

        <Viewer viewing={viewing} onClose={() => setViewing(null)} onStep={setViewing} />
      </div>
    )
  }

  // ── the scrapbook itself ───────────────────────────────────────────────────
  const collections = book.collections.filter(c =>
    matches([c.name, c.description, c.type], query))
  const loose = book.loose.filter(it =>
    matches([it.context_subject, it.collection_name, it.content_date, it.place_name], query))

  if (!book.collections.length && !book.loose.length) {
    return <p style={muted}>Nothing in {person.known_as || 'their'} scrapbook yet.</p>
  }

  return (
    <div>
      <Filter value={query} onChange={setQuery} />

      {collections.length > 0 && (
        <div style={{ ...grid, marginBottom: 24 }}>
          {collections.map(c => (
            <Card
              key={c.id}
              collection={c}
              canEdit={isAdmin}
              onOpen={() => navigate(`${base}/${c.id}`)}
            />
          ))}
        </div>
      )}

      {loose.length > 0 && (
        <section>
          <h2 style={{ fontSize: 14, fontWeight: 500, margin: '0 0 8px' }}>
            Loose items
          </h2>
          <ScrapbookItems items={loose} onOpen={i => setViewing({ items: loose, index: i })} />
        </section>
      )}

      {!collections.length && !loose.length && <p style={muted}>Nothing matches.</p>}

      <Viewer viewing={viewing} onClose={() => setViewing(null)} onStep={setViewing} />
    </div>
  )
}

function Card({ collection: c, canEdit, onOpen }) {
  const [priv, setPriv] = useState(c.private)

  async function togglePrivate() {
    const next = !priv
    const res = await fetch(`/api/collections/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ private: next }),
    })
    if (res.ok) setPriv(next)
  }

  return (
    <CollectionCard
      title={c.name}
      subtitle={collectionCount(c)}
      description={c.description}
      cover={c.cover_path ? mediaUrl(c.cover_path) : null}
      coverAlt=""
      icon={priv ? Lock : BookOpen}
      // Sub-collections make this a container of containers; a single box of
      // loose pages is not, and the stack would be a small lie.
      stacked={(c.child_count || 0) > 0}
      onClick={onOpen}
    >
      {canEdit && (
        <CollectionCard.Actions>
          <button
            type="button"
            onClick={togglePrivate}
            title={priv
              ? 'Only you can see this. Click to let family see it.'
              : 'Family can see this. Click to keep it to yourself.'}
            aria-label={priv ? 'Make visible to family' : 'Keep private'}
            style={{
              display: 'grid', placeItems: 'center', width: 28, height: 28,
              borderRadius: '50%', border: 0, cursor: 'pointer',
              background: 'rgba(0,0,0,.55)', color: priv ? '#fdd663' : '#fff',
            }}
          >
            {priv ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
        </CollectionCard.Actions>
      )}
    </CollectionCard>
  )
}

function Viewer({ viewing, onClose, onStep }) {
  if (!viewing) return null
  const { items, index } = viewing
  const item = items[index]
  if (!item) return null

  return (
    <MediaDetail
      item={{ ...item, url: item.url || mediaUrl(item.path) }}
      onClose={onClose}
      hasPrev={index > 0}
      hasNext={index < items.length - 1}
      onPrev={() => onStep({ items, index: index - 1 })}
      onNext={() => onStep({ items, index: index + 1 })}
    />
  )
}

function Filter({ value, onChange }) {
  return (
    <label style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      height: 34, padding: '0 14px', borderRadius: 17,
      background: C.surface, marginBottom: 14, minWidth: 240,
    }}>
      <Search size={15} color={C.muted} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search this scrapbook"
        aria-label="Search this scrapbook"
        style={{
          border: 0, background: 'transparent', outline: 'none',
          font: 'inherit', fontSize: 13, color: C.text, width: '100%',
        }}
      />
    </label>
  )
}

const grid = {
  display: 'grid', gap: 14,
  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
}
const back = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  border: 0, background: 'transparent', color: C.muted,
  fontSize: 12.5, cursor: 'pointer', padding: '2px 0',
}
const muted = { fontSize: 13, color: C.muted, margin: 0 }

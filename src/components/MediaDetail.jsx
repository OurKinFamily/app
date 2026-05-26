import { useState, useEffect } from 'react'
import { mediaUrl } from '../../lib/media'
import { searchPeople } from '../../lib/api'
import { DetailSection } from './DetailSection'
import { Tag } from './Tag'
import { Thumb } from './Thumb'
import { EntityChip } from './EntityChip'
import { Button } from './Button'
import { Select } from './Select'
import { MediaDetailMeta } from './MediaDetailMeta'

const FACE_PREVIEW = 6

function personToOption(p) {
  return {
    value: p.id,
    text: p.known_as || p.name,
    avatar: p.avatar ? mediaUrl(p.avatar) : null,
    initials: true,
    label: (
      <>
        {p.known_as && p.known_as !== p.name && <span className="text-white/35">({p.known_as}) </span>}
        {p.name}
      </>
    ),
  }
}

// Mount one per item (key by item.path) so state resets cleanly on navigation.
// ctx (from MediaLightbox): { setHighlight, setFaces, setBumpDetail, openAssign, ... }
export function MediaDetail({ item, ctx }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAllFaces, setShowAllFaces] = useState(false)
  const [addPersonOpen, setAddPersonOpen] = useState(false)
  const [addResults, setAddResults] = useState([])

  const onAddSearch = async q => {
    if (!q.trim()) { setAddResults([]); return }
    try {
      const r = await searchPeople(q)
      setAddResults(r.map(personToOption))
    } catch { setAddResults([]) }
  }

  const tagPerson = async option => {
    try {
      await fetch(`/api/people/${option.value}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_path: item.path }),
      })
    } catch { /* ignore network errors */ }
    setAddPersonOpen(false)
    setAddResults([])
    ctx?.bumpDetail?.()
  }

  useEffect(() => {
    if (!item?.path) return
    let alive = true
    fetch(`/api/gallery/detail?path=${encodeURIComponent(item.path)}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive && d) setDetail(d) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [item?.path])

  // Publish heritage audio so the lightbox can render its toggle button.
  useEffect(() => {
    if (!ctx?.setAudio) return
    if (detail?.heritage?.audio_url) {
      ctx.setAudio({ url: detail.heritage.audio_url, description: detail.heritage.audio_description })
    } else {
      ctx.setAudio(null)
    }
  }, [detail, ctx])

  // Push the face list up so the lightbox can draw interactive bboxes over the image.
  useEffect(() => {
    if (!ctx?.setFaces) return
    if (!detail) { ctx.setFaces([]); return }
    const list = [
      ...(detail.people || []).filter(p => p.bbox).map(p => ({
        bbox: p.bbox, label: p.known_as || p.name, identified: true, person: p,
      })),
      ...(detail.unidentified || []).filter(f => f.bbox).map(f => ({
        bbox: f.bbox, identified: false, face: f,
      })),
    ]
    ctx.setFaces(list)
  }, [detail, ctx])


  const heritage = detail?.heritage
  return (
    <div>
      <p className="mb-3 break-all text-[12px] font-medium leading-snug text-white/55">{item.filename || item.path}</p>
      {(heritage?.context_subject || heritage?.context_type) && (
        <DetailSection title="Subject">
          {heritage.context_subject && (
            <p className="mb-1 text-[13px] font-medium text-white/80">{heritage.context_subject}</p>
          )}
          {heritage.context_type && (
            <Tag>{String(heritage.context_type).replace(/_/g, ' ')}</Tag>
          )}
        </DetailSection>
      )}
      {loading && <p className="text-[11px] text-white/20">Loading…</p>}
      {detail && (
        <>
          <DetailSection title={`People${detail.people?.length ? ` · ${detail.people.length}` : ''}`}>
            {detail.people?.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {detail.people.map(p => (
                  <span
                    key={p.id}
                    onMouseEnter={() => p.bbox && ctx?.setHighlight?.({ bbox: p.bbox, label: p.known_as || p.name })}
                    onMouseLeave={() => ctx?.setHighlight?.(null)}
                  >
                    <EntityChip
                      to={`/manage/people/${p.id}`}
                      avatar={p.crop_url || (p.avatar ? mediaUrl(p.avatar) : null)}
                      initials
                      text={p.known_as || p.name}
                    />
                  </span>
                ))}
              </div>
            )}
            {addPersonOpen ? (
              <Select
                autoFocus
                options={addResults}
                value={null}
                onChange={tagPerson}
                onQueryChange={onAddSearch}
                placeholder="Add a person…"
              />
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setAddPersonOpen(true)}>+ Add person</Button>
            )}
          </DetailSection>

          {detail.unidentified?.length > 0 && (() => {
            const all = detail.unidentified
            // When collapsed and there's overflow, show FACE_PREVIEW-1 real tiles
            // and a "+N more" tile in the last slot. Click it to expand.
            const overflowing = !showAllFaces && all.length > FACE_PREVIEW
            const visible = showAllFaces
              ? all
              : (overflowing ? all.slice(0, FACE_PREVIEW - 1) : all)
            const moreCount = overflowing ? all.length - visible.length : 0
            return (
              <DetailSection title={`Unidentified · ${all.length}`}>
                <div className="flex flex-wrap gap-1.5">
                  {visible.map(f => (
                    <Thumb
                      key={f.face_index}
                      src={f.crop_url}
                      onClick={e => ctx?.openAssign?.(f, e.clientX, e.clientY)}
                      className="h-10 w-10"
                    />
                  ))}
                  {moreCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAllFaces(true)}
                      className="flex h-10 w-10 items-center justify-center rounded border border-white/10 bg-white/5 text-[11px] font-medium text-white/55 transition-colors hover:bg-white/10 hover:text-white"
                      aria-label={`Show ${moreCount} more`}
                    >
                      +{moreCount}
                    </button>
                  )}
                  {showAllFaces && all.length > FACE_PREVIEW && (
                    <button
                      type="button"
                      onClick={() => setShowAllFaces(false)}
                      className="flex h-10 w-10 items-center justify-center rounded border border-white/10 bg-white/5 text-[10px] font-medium text-white/55 transition-colors hover:bg-white/10 hover:text-white"
                      aria-label="Show less"
                    >
                      less
                    </button>
                  )}
                </div>
              </DetailSection>
            )
          })()}

          {detail.objects?.length > 0 && (
            <DetailSection title="Detected">
              <div className="flex flex-wrap gap-1.5">
                {detail.objects.map(o => <Tag key={o.label}>{o.label}{o.count > 1 ? ` ×${o.count}` : ''}</Tag>)}
              </div>
            </DetailSection>
          )}

          <MediaDetailMeta sidecar={detail.sidecar} heritage={detail.heritage} />
        </>
      )}
    </div>
  )
}

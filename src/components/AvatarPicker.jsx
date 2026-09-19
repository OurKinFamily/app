import { useEffect, useRef, useState } from 'react'
import { getFaces, setAvatar } from '../lib/api'
import { mediaUrl } from '../lib/media'
import { Modal } from '../ui/Modal'
import { C } from '../ui/tokens'

/**
 * Which face of theirs stands for them.
 *
 * Every confirmed face, newest first, sixty at a time. There is no preview and
 * no confirm step: clicking one sets it, because the grid IS the preview and
 * the cost of a wrong pick is clicking the right one after.
 */
const PAGE = 60

export function AvatarPicker({ person, onClose, onSaved }) {
  const [faces, setFaces] = useState(null)
  const [shown, setShown] = useState(PAGE)
  const [saving, setSaving] = useState(false)
  const sentinel = useRef(null)

  useEffect(() => {
    let alive = true
    getFaces(person.id)
      .then(f => { if (alive) setFaces(f) })
      .catch(() => { if (alive) setFaces([]) })
    return () => { alive = false }
  }, [person.id])

  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setShown(n => n + PAGE) },
      { rootMargin: '100px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [faces])

  async function pick(cropPath) {
    setSaving(true)
    await setAvatar(person.id, cropPath)
    onSaved(cropPath)
    onClose()
  }

  return (
    <Modal title="Choose a face" onClose={onClose} width={560}>
      {faces === null && <p style={hint}>Looking…</p>}
      {faces?.length === 0 && (
        <p style={hint}>No faces confirmed for them yet.</p>
      )}

      {faces?.length > 0 && (
        <>
          <div style={{
            display: 'grid', gap: 5,
            gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))',
          }}>
            {faces.slice(0, shown).map((face, i) => (
              <button
                key={`${face.crop_path}-${i}`}
                type="button"
                onClick={() => pick(face.crop_path)}
                disabled={saving}
                style={{
                  padding: 0, border: 0, borderRadius: 9, overflow: 'hidden',
                  background: C.hover, cursor: saving ? 'default' : 'pointer',
                  opacity: saving ? 0.5 : 1,
                }}
              >
                <img
                  src={mediaUrl(face.crop_path)}
                  alt=""
                  loading="lazy"
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                />
              </button>
            ))}
          </div>
          {shown < faces.length && <div ref={sentinel} style={{ height: 16 }} />}
        </>
      )}
    </Modal>
  )
}

const hint = { fontSize: 13, color: C.muted, textAlign: 'center', padding: '24px 0', margin: 0 }

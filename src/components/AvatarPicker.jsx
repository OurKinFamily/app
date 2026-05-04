import { useEffect, useRef, useState } from 'react'
import { getFaces, setAvatar } from '../lib/api'

const PAGE_SIZE = 60

export function AvatarPicker({ person, onClose, onSaved }) {
  const [faces, setFaces] = useState(null)
  const [shown, setShown] = useState(PAGE_SIZE)
  const [saving, setSaving] = useState(false)
  const sentinelRef = useRef(null)

  useEffect(() => {
    getFaces(person.id).then(setFaces)
  }, [person.id])

  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setShown(n => n + PAGE_SIZE) },
      { rootMargin: '100px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [faces])

  const handlePick = async (cropPath) => {
    setSaving(true)
    await setAvatar(person.id, cropPath)
    onSaved(cropPath)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-zinc-900 rounded-xl w-[560px] max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-white font-medium">Choose a face</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {faces === null && (
            <div className="text-white/40 text-sm text-center py-8">Loading…</div>
          )}
          {faces?.length === 0 && (
            <div className="text-white/40 text-sm text-center py-8">No confirmed faces yet.</div>
          )}
          {faces && faces.length > 0 && (
            <>
              <div className="grid grid-cols-6 gap-1">
                {faces.slice(0, shown).map((face, i) => (
                  <button
                    key={i}
                    onClick={() => handlePick(face.crop_path)}
                    disabled={saving}
                    className="aspect-square overflow-hidden rounded hover:ring-2 hover:ring-rose-400 transition focus:outline-none"
                  >
                    <img
                      src={`/api/media/${face.crop_path}`}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
              {shown < faces.length && <div ref={sentinelRef} className="h-4" />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

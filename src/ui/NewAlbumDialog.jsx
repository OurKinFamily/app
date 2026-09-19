import { useEffect, useRef, useState } from 'react'
import { C } from './tokens'

/**
 * Making or renaming an album.
 *
 * A dialog rather than v1's side drawer: three fields do not need a panel that
 * slides, and a drawer on a page whose content is a grid pushes the grid about
 * while you type.
 *
 * Pass an `album` to edit it; leave it out to create one. The fields are the
 * same either way, which is the whole reason this is one component.
 */

const field = {
  width: '100%', height: 34, padding: '0 10px',
  border: `1px solid ${C.border}`, borderRadius: 8,
  fontSize: 13, font: 'inherit', background: C.bg, color: C.text,
  boxSizing: 'border-box',
}

export function NewAlbumDialog({ album, onClose, onCreated }) {
  const editing = !!album
  const [name, setName] = useState(album?.name || '')
  const [description, setDescription] = useState(album?.description || '')
  const [isPrivate, setIsPrivate] = useState(!!album?.is_private)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const firstField = useRef(null)

  // A dialog that opens without focus leaves a keyboard user tabbing through
  // the page behind it to reach the field they asked for. Nothing else needs
  // resetting here: the parent mounts this only while it is open, so every
  // opening starts from the initial state.
  useEffect(() => {
    const t = setTimeout(() => firstField.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [])

  async function submit(e) {
    e.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(editing ? `/api/albums/${album.id}` : '/api/albums/', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          is_private: isPrivate,
        }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      // PATCH answers 204, so there is no body to read on an edit.
      const saved = editing ? album : await res.json()
      onCreated?.(saved.id, { name: name.trim(), description: description.trim() || null, is_private: isPrivate })
      onClose?.()
    } catch {
      // Say so rather than closing on a failure: an album that silently was
      // not created is worse than an error message.
      setError(`Could not ${editing ? 'save' : 'create'} the album. Try again.`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="presentation"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose?.() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1300,
        display: 'grid', placeItems: 'center',
        background: 'rgba(32,33,36,.5)',
      }}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label={editing ? 'Edit album' : 'New album'}
        onKeyDown={e => { if (e.key === 'Escape') onClose?.() }}
        style={{
          width: 'min(420px, calc(100vw - 32px))',
          background: C.bg, borderRadius: 14, padding: 20,
          boxShadow: '0 8px 40px rgba(0,0,0,.25)',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}
      >
        <h2 style={{ fontSize: 17, fontWeight: 500, margin: 0 }}>
          {editing ? 'Edit album' : 'New album'}
        </h2>

        <label style={{ fontSize: 12, color: C.muted }}>
          Name
          <input
            ref={firstField}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Christmas 2024"
            style={{ ...field, marginTop: 4 }}
          />
        </label>

        <label style={{ fontSize: 12, color: C.muted }}>
          Description
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional"
            style={{ ...field, marginTop: 4 }}
          />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={e => setIsPrivate(e.target.checked)}
            style={{ width: 15, height: 15, accentColor: C.activeText, cursor: 'pointer' }}
          />
          Private — only you can see it
        </label>

        {error && <p style={{ color: '#c5221f', fontSize: 12, margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 2 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              height: 34, padding: '0 14px', borderRadius: 17, fontSize: 13,
              border: `1px solid ${C.border}`, background: 'transparent',
              color: C.text, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            style={{
              height: 34, padding: '0 16px', borderRadius: 17, fontSize: 13,
              border: 0, background: C.activeText, color: '#fff',
              opacity: saving || !name.trim() ? 0.5 : 1,
              cursor: saving || !name.trim() ? 'default' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : editing ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}

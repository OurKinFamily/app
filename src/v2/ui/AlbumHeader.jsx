import { useState } from 'react'
import { Image, Lock, Pencil, Trash2, Users, X } from 'lucide-react'
import { ConfirmPopover } from './ConfirmPopover'
import { C } from './tokens'

/**
 * The top of an album: what it is called, what it is for, and who can see it.
 *
 * The v1 page put the name in white text, which vanished against v2's white
 * ground and left a page that looked empty. Name and description are the two
 * things somebody opens an album to read, so they lead, in the same sizes the
 * gallery uses for its own heading.
 *
 * The selection bar replaces the actions rather than joining them: while
 * photographs are selected, what you can do is about the photographs.
 */
export function AlbumHeader({
  album, selectedCount, onEdit, onDelete, onRemoveSelected,
  onClearSelection, onSetCover,
}) {
  const [confirming, setConfirming] = useState(false)
  const count = album.total ?? album.items?.length ?? 0
  const selecting = selectedCount > 0

  return (
    <header style={{ margin: '4px 0 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 400, margin: 0, lineHeight: 1.25 }}>
            {album.name}
          </h1>

          {album.description && (
            <p style={{
              fontSize: 13.5, color: C.muted, margin: '6px 0 0',
              maxWidth: '68ch', lineHeight: 1.5,
            }}>
              {album.description}
            </p>
          )}

          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 12.5, color: C.muted, marginTop: 8,
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              {album.is_private ? <Lock size={13} /> : <Users size={13} />}
              {album.is_private ? 'Private' : 'Shared'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{count} {count === 1 ? 'photo' : 'photos'}</span>
            {album.created_by_name && (
              <>
                <span aria-hidden="true">·</span>
                <span>Made by {album.created_by_name.split(' ')[0]}</span>
              </>
            )}
          </div>
        </div>

        {!selecting && (
          <div style={{ display: 'flex', gap: 8, flex: '0 0 auto', position: 'relative' }}>
            <button type="button" onClick={onEdit} style={pill}>
              <Pencil size={14} /> Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              style={{ ...pill, color: '#c5221f', borderColor: '#f3c6c4' }}
            >
              <Trash2 size={14} /> Delete
            </button>
            {confirming && (
              <ConfirmPopover
                message={`Delete “${album.name}”? The photographs stay in the archive.`}
                confirmLabel="Delete album"
                onCancel={() => setConfirming(false)}
                onConfirm={onDelete}
              />
            )}
          </div>
        )}
      </div>

      {selecting && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          margin: '14px -6px 0', padding: '8px 6px',
          borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
        }}>
          <button
            type="button"
            onClick={onClearSelection}
            aria-label="Leave selection mode"
            style={{
              display: 'grid', placeItems: 'center', width: 32, height: 32,
              border: 0, borderRadius: '50%', background: 'transparent',
              color: C.muted, cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
          <strong style={{ fontWeight: 500, fontSize: 14 }}>
            {selectedCount} selected
          </strong>
          <div style={{ flex: 1 }} />
          {onSetCover && (
            <button type="button" onClick={onSetCover} style={linkish}>
              <Image size={14} /> Use as cover
            </button>
          )}
          <button type="button" onClick={onRemoveSelected} style={linkish}>
            Remove from album
          </button>
        </div>
      )}
    </header>
  )
}

const pill = {
  display: 'inline-flex', alignItems: 'center', gap: 7,
  height: 34, padding: '0 14px', borderRadius: 17,
  border: `1px solid ${C.border}`, background: 'transparent',
  color: C.text, fontSize: 13, cursor: 'pointer',
}

const linkish = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  border: 0, background: 'transparent', color: C.activeText,
  fontSize: 13, cursor: 'pointer',
}

import { useState } from 'react'
import { Album, Calendar, Download, Heart, HeartOff, Trash2, X } from 'lucide-react'
import { DateEditor } from './DateEditor'
import { ConfirmPopover } from './ConfirmPopover'
import { useBulkActions } from '../lib/useBulkActions'
import { C } from './tokens'

/**
 * What you can do to the photographs you have picked.
 *
 * One bar for every view that has a selection — the gallery, an album, a
 * person — because "select some things, then act on them" should not mean
 * something different depending on which page you are standing on.
 *
 * Deleting asks first. The others do not: favouriting forty photographs is
 * undone by unfavouriting them, and a redate can be redated. Only the trash
 * needs a moment's thought, and it says how many.
 */
export function SelectionBar({ paths, onClear, onAddToAlbum, onChanged, compact }) {
  const [dating, setDating] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const { busy, favourite, unfavourite, redate, remove, download } = useBulkActions({
    paths,
    onDone: ({ name }) => {
      setDating(false)
      setConfirming(false)
      onChanged?.(name)
    },
  })

  const n = paths.length

  return (
    <div style={{
      // Sticky under the app header: a selection made at the bottom of a
      // month is acted on from wherever the reader has scrolled to, and a bar
      // that scrolls away means finding it again before you can use it.
      position: 'sticky', top: 64, zIndex: 6,
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      margin: compact ? '0 -6px 8px' : '0 -6px',
      padding: 6,
      borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
      background: C.bg,
    }}>
      <button
        type="button"
        onClick={onClear}
        aria-label="Leave selection mode"
        style={{
          display: 'grid', placeItems: 'center', width: 30, height: 30,
          border: 0, borderRadius: '50%', background: 'transparent',
          color: C.muted, cursor: 'pointer',
        }}
      >
        <X size={17} />
      </button>

      <strong style={{ fontWeight: 500, fontSize: 13.5 }}>
        {n > 0 ? `${n.toLocaleString()} selected` : 'Select photos'}
      </strong>

      <div style={{ flex: 1 }} />

      {n > 0 && (
        <>
          {busy && (
            <span style={{ fontSize: 12.5, color: C.muted }}>
              {LABELS[busy] || 'Working'}…
            </span>
          )}

          <Act icon={Heart} label="Favourite" onClick={favourite} disabled={!!busy} />
          <Act icon={HeartOff} label="Remove favourite" onClick={unfavourite} disabled={!!busy} />

          <Act icon={Download} label="Download" onClick={download} disabled={!!busy} />

          {onAddToAlbum && (
            <Act icon={Album} label="Add to album" onClick={() => onAddToAlbum(paths)} disabled={!!busy} />
          )}

          <span style={{ position: 'relative' }}>
            <Act icon={Calendar} label="Set the date" onClick={() => setDating(v => !v)} disabled={!!busy} />
            {dating && (
              <div style={popover}>
                <p style={{ fontSize: 12, color: C.muted, margin: '0 0 8px' }}>
                  Give all {n.toLocaleString()} the same date.
                </p>
                <DateEditor
                  value={null}
                  precision="day"
                  onSave={redate}
                  onCancel={() => setDating(false)}
                />
              </div>
            )}
          </span>

          <span style={{ position: 'relative' }}>
            <Act icon={Trash2} label="Move to trash" onClick={() => setConfirming(true)} disabled={!!busy} danger />
            {confirming && (
              <ConfirmPopover
                align="right"
                message={`Move ${n.toLocaleString()} ${n === 1 ? 'photo' : 'photos'} to the trash?`}
                detail="They move to /photos/trash with their sidecars and can be put back. Face assignments on them are lost."
                confirmLabel={`Yes, move ${n === 1 ? 'it' : 'them'}`}
                onCancel={() => setConfirming(false)}
                onConfirm={remove}
              />
            )}
          </span>
        </>
      )}
    </div>
  )
}

const LABELS = {
  download: 'Zipping',
  favourite: 'Favouriting',
  unfavourite: 'Removing',
  redate: 'Dating',
  delete: 'Deleting',
}

function Act({ icon: Icon, label, onClick, disabled, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      style={{
        display: 'grid', placeItems: 'center', width: 32, height: 32,
        border: 0, borderRadius: '50%', background: 'transparent',
        color: danger ? '#c5221f' : C.muted,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Icon size={17} />
    </button>
  )
}

const popover = {
  position: 'absolute', top: 38, right: 0, zIndex: 40,
  width: 260, padding: 12, borderRadius: 12,
  background: C.bg, border: `1px solid ${C.border}`,
  boxShadow: '0 8px 30px rgba(0,0,0,.18)',
}

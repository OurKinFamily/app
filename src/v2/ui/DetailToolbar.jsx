import { Album, Crop as CropIcon, Download, Heart, Info, RotateCw, SlidersHorizontal, Sparkles, Trash2, X } from 'lucide-react'
import { Action } from './DetailControls'
import { ConfirmPopover } from './ConfirmPopover'

/**
 * The row of actions over a photograph.
 *
 * Every button is optional and absent unless the page hands over a handler —
 * "Add to album" spent a while rendering nowhere for exactly that reason, and
 * a person's page has no business offering some of these at all.
 *
 * Crop is hidden for video, where there is nothing sensible to do with a
 * rectangle.
 */
export function DetailToolbar({
  item, wide, favourited, showInfo, confirmDelete,
  onClose, onToggleFavourite, onAddToAlbum, onRotate, onStartCrop, onCrop, onRestore, onTone,
  onDownload, onDelete, onConfirmDelete, onToggleInfo,
}) {
  return (
    <>
          <Action label="Close" onClick={onClose}><X size={17} /></Action>

          <div style={{ flex: 1 }} />

          {onToggleFavourite && (
            <Action
              label={favourited ? 'Remove from favourites' : 'Add to favourites'}
              onClick={() => onToggleFavourite(item)}
            >
              <Heart
                size={20}
                fill={favourited ? '#e8384f' : 'none'}
                color={favourited ? '#e8384f' : 'currentColor'}
              />
            </Action>
          )}
          {onAddToAlbum && (
            <Action label="Add to album" onClick={() => onAddToAlbum(item)}>
              <Album size={17} />
            </Action>
          )}
          {onRotate && (
            <Action label="Rotate" onClick={() => onRotate(item)}>
              <RotateCw size={17} />
            </Action>
          )}
          {onCrop && !item.is_video && (
            <Action
              label="Crop"
              onClick={onStartCrop}
            >
              <CropIcon size={17} />
            </Action>
          )}
          {onTone && !item.is_video && (
            <Action label="Adjust light" onClick={onTone}>
              <SlidersHorizontal size={17} />
            </Action>
          )}
          {onRestore && !item.is_video && (
            <Action label="Restore" onClick={onRestore}>
              <Sparkles size={17} />
            </Action>
          )}
          {onDownload && (
            <Action label="Download" onClick={() => onDownload(item)}>
              <Download size={17} />
            </Action>
          )}
          {onDelete && (
            <span style={{ position: 'relative' }}>
              <Action label="Delete" onClick={() => onConfirmDelete(true)} danger>
                <Trash2 size={17} />
              </Action>
              {confirmDelete && (
                <ConfirmPopover
                  align="right"
                  message="Move this to the trash?"
                  detail="The file and its sidecars move to /photos/trash and can be put back. Face assignments on it are lost."
                  confirmLabel="Yes, delete"
                  onCancel={() => onConfirmDelete(false)}
                  onConfirm={async () => {
                    await onDelete(item)
                    onConfirmDelete(false)
                  }}
                />
              )}
            </span>
          )}
          {/* Only useful where the panel is a panel. On a narrow screen it is
              simply below the photograph, and you scroll to it. */}
          {wide && (
            <Action
              label={showInfo ? 'Hide details' : 'Show details'}
              onClick={onToggleInfo}
            >
              <Info size={17} />
            </Action>
          )}
    </>
  )
}

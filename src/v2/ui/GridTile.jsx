import { memo } from 'react'
import { MediaTile } from './MediaTile'
import { mediaTileProps, formatDuration } from './mediaTileProps'

/**
 * One tile in the grid, memoised.
 *
 * MediaTile is itself memoised, but that achieves nothing when the caller hands
 * it fresh JSX children and inline arrow callbacks on every render — memo
 * compares props shallowly and a new object never matches. This wrapper takes
 * only primitives and stable callbacks, builds the children itself, and so can
 * genuinely skip re-rendering.
 *
 * It matters more since virtualisation: a month re-renders whenever the scroll
 * window moves, and a busy month is a thousand tiles.
 */
function GridTileBase({
  item, width, height, priority,
  selected, favourited, selectionMode,
  onOpen, onToggleSelect, onToggleFavourite, onLongPress,
}) {
  return (
    <div
      data-media-path={item.path}
      style={{ width, height, flex: '0 0 auto' }}
    >
      <MediaTile
        {...mediaTileProps(item)}
        priority={priority}
        selected={selected}
        selectionMode={selectionMode}
        onLongPress={onLongPress}
        onToggleSelect={(next, e) => onToggleSelect(item.path, next, e)}
        onClick={e => onOpen(item, e)}
      >
        <MediaTile.Top justify="space-between">
          {selected
            ? <MediaTile.Checkbox
                checked
                onChange={(v, e) => onToggleSelect(item.path, false, e)}
              />
            : <MediaTile.OnHover>
                <MediaTile.Checkbox
                  onChange={(v, e) => onToggleSelect(item.path, true, e)}
                />
              </MediaTile.OnHover>}

          {/* A favourited heart stays put: state worth seeing across a whole
              grid, not a control you reach for. */}
          {favourited
            ? <MediaTile.Favourite favourited onChange={() => onToggleFavourite(item)} />
            : <MediaTile.OnHover>
                <MediaTile.Favourite onChange={() => onToggleFavourite(item)} />
              </MediaTile.OnHover>}
        </MediaTile.Top>

        {item.is_video && formatDuration(item.duration) && (
          <MediaTile.Bottom justify="flex-end">
            <span style={{
              color: '#fff', fontSize: 12, fontWeight: 500,
              textShadow: '0 1px 2px rgba(0,0,0,.6)',
            }}>
              {formatDuration(item.duration)}
            </span>
          </MediaTile.Bottom>
        )}
      </MediaTile>
    </div>
  )
}

export const GridTile = memo(GridTileBase)

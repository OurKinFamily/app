import { C } from './tokens'
import { TileCheckbox } from './TileCheckbox'



export function GroupHeader({ children, count, places, allSelected, onToggleAll }) {
  return (
    <div
      style={{
        position: 'sticky',
        // Sits below the app header, which is 64px and also sticky.
        top: 64,
        zIndex: 3,
        background: C.bg,
        // Bleed a few pixels either side. computeRows rounds each row's height,
        // so a row can finish a pixel wider than the container — and a sticky
        // bar at exactly content width lets that pixel show through as a sliver
        // of photo sliding under it.
        margin: '0 -6px',
        padding: '16px 6px 8px',
        fontSize: 14,
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        // Fixed, or the 30px checkbox changes the header's height the moment
        // it appears and the whole group nudges down.
        minHeight: 46,
        boxSizing: 'border-box',
        gap: 8,
      }}
    >
      {children}
      {count != null && (
        <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>{count}</span>
      )}
      {places?.length > 0 && (
        <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>
          · {places.join(', ')}
        </span>
      )}
      {onToggleAll && (
        <>
          <div style={{ flex: 1 }} />
          {/* Same control as the tiles use, so selecting a whole month looks
              like selecting one photograph. */}
          <TileCheckbox
            checked={allSelected}
            onChange={onToggleAll}
            label={allSelected ? 'Deselect this group' : 'Select this group'}
          />
        </>
      )}
    </div>
  )
}

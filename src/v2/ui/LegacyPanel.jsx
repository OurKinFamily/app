import { C } from './tokens'

/**
 * A v1 tab, shown honestly.
 *
 * The person page has eight tabs and 2,464 lines behind them. Reskinning all
 * of that before any of it is usable would mean a long time with nothing to
 * look at, and dropping v1's components straight onto a white page is worse
 * than useless — they are written in white text, so the album page arrived
 * looking empty.
 *
 * So an unported tab keeps the dark ground it was drawn for, inside a panel
 * that says as much. It looks like what it is: the old page, in the new frame,
 * waiting its turn. Each one leaves as it gets a v2 pass.
 */
export function LegacyPanel({ children }) {
  return (
    <div>
      <p style={{
        fontSize: 11.5, color: C.muted, margin: '0 0 6px',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span aria-hidden="true" style={{
          width: 6, height: 6, borderRadius: '50%', background: '#f9ab00',
        }} />
        Not reskinned yet — this is the v1 tab.
      </p>
      <div style={{
        background: '#18181b', borderRadius: 14, overflow: 'hidden',
        border: `1px solid ${C.border}`,
      }}>
        {children}
      </div>
    </div>
  )
}

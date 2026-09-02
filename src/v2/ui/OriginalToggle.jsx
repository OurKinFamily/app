import { Eye } from 'lucide-react'

/**
 * "This photograph was restored — here is what it looked like before."
 *
 * Only appears when an original exists, which is only after the restoration
 * pipeline has been run and accepted. That makes it the one place in the app
 * that admits part of the picture on screen is a machine's work, so it stays
 * visible rather than hiding until hover: a viewer who does not know to look
 * for it is exactly the one who should be told.
 *
 * Quiet when it is off, plain when it is on — while the original is showing,
 * the label spells it out, because a restored photograph and its original can
 * look nearly identical and forgetting which you are looking at is easy.
 */
export function OriginalToggle({ showing, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={showing
        ? 'Showing the original — click for the restored version'
        : 'This photograph was restored. Click to see the original.'}
      aria-label={showing ? 'Show the restored version' : 'Show the original'}
      aria-pressed={showing}
      style={{
        position: 'absolute', right: 12, bottom: 12, zIndex: 6,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        height: 30, justifyContent: 'center',
        padding: showing ? '0 12px' : 0,
        width: showing ? 'auto' : 30,
        border: 0, borderRadius: 15, cursor: 'pointer', fontSize: 12,
        background: showing ? '#fff' : 'rgba(0,0,0,.55)',
        color: showing ? '#1f1f1f' : '#fff',
      }}
    >
      <Eye size={15} />
      {showing && 'Original'}
    </button>
  )
}

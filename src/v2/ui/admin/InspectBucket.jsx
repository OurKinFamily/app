import { Modal } from '../Modal'
import { TONES } from '../../lib/useDiskReport'
import { thumbUrl } from '../../../lib/media'
import { C } from '../tokens'

/**
 * What one pile of unaccounted-for files actually is, and what to do about it.
 *
 * Neither action is wired to a button, deliberately: both move or delete
 * thousands of files, and the command is given to be read, checked and run in
 * a terminal where it can be watched. The dry-run form is listed first because
 * it is the one that should be run first.
 */
export function InspectBucket({ bucket, drift, onClose }) {
  if (!bucket) return null

  const stale = bucket.kind === 'drop'
  const side = stale ? drift.in_graph_not_on_disk : drift.on_disk_not_in_graph
  const samples = side?.samples || []
  const byRoot = side?.by_root || {}
  const tone = TONES[bucket.tone] || TONES.info

  return (
    <Modal title={bucket.label} onClose={onClose} width={720}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{
          padding: '2px 9px', borderRadius: 999, fontSize: 11,
          background: tone.bg, color: tone.fg,
        }}>
          {bucket.count.toLocaleString()} files
        </span>
      </div>

      <p style={{ fontSize: 13, margin: '0 0 14px', maxWidth: '72ch' }}>{bucket.desc}</p>

      <Label>Where they are</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {['archive', 'heritage']
          .filter(root => byRoot[root] > 0)
          .map(root => (
            <span key={root} style={{
              padding: '6px 12px', borderRadius: 10, fontSize: 12,
              border: `1px solid ${C.border}`,
            }}>
              <span style={{ color: C.muted, textTransform: 'capitalize' }}>{root} </span>
              <strong style={{ fontWeight: 500 }}>{byRoot[root].toLocaleString()}</strong>
            </span>
          ))}
      </div>

      <Label>{stale ? 'What dropping them does' : 'What mm archive does'}</Label>
      <p style={{ fontSize: 12.5, color: C.muted, margin: '0 0 12px', maxWidth: '72ch' }}>
        {stale
          ? 'Deletes each Media node whose file no longer exists, along with every relationship hanging off it — the faces named in it, the albums it was in, any date corrected by hand.'
          : 'Reads the date out of the file, renames it to YYYY-MM-DD_HH-MM-SS_###.ext, moves it into /photos/archive/YYYY/MM/, then extracts its metadata and writes the sidecar.'}
      </p>

      <Label>Worth knowing first</Label>
      <ul style={{ fontSize: 12.5, color: C.muted, margin: '0 0 14px', paddingLeft: 18, maxWidth: '72ch' }}>
        {(stale ? STALE_RISKS : ARCHIVE_RISKS).map(risk => (
          <li key={risk} style={{ marginBottom: 4 }}>{risk}</li>
        ))}
      </ul>

      <Label>Run it yourself</Label>
      <pre style={{
        margin: '0 0 14px', padding: 12, borderRadius: 10,
        background: '#18181b', color: '#e4e4e7', overflowX: 'auto',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 11.5, lineHeight: 1.6,
      }}>
        {stale ? staleCommand() : archiveCommand(bucket.flags)}
      </pre>

      {!stale && samples.length > 0 && (
        <>
          <Label>A few of them</Label>
          <div style={{
            display: 'grid', gap: 4, marginBottom: 10,
            gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
          }}>
            {samples.slice(0, 16).map(path => (
              <img
                key={path}
                src={thumbUrl(path)}
                alt=""
                title={path}
                loading="lazy"
                onError={e => { e.currentTarget.style.visibility = 'hidden' }}
                style={{
                  width: '100%', aspectRatio: '1', objectFit: 'cover',
                  borderRadius: 6, background: C.hover,
                }}
              />
            ))}
          </div>
          <p style={{ fontSize: 11, color: C.muted, margin: '0 0 12px' }}>
            Taken from everything unindexed, not just this pile. Videos and broken files show nothing.
          </p>
        </>
      )}

      {samples.length > 0 && (
        <details>
          <summary style={{ fontSize: 12, color: C.muted, cursor: 'pointer' }}>Sample paths</summary>
          <div style={{
            maxHeight: 190, overflowY: 'auto', marginTop: 6, padding: 8,
            borderRadius: 8, background: C.surface,
            fontFamily: 'ui-monospace, monospace', fontSize: 11, color: C.muted,
          }}>
            {samples.slice(0, 25).map(path => (
              <div key={path} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {path}
              </div>
            ))}
          </div>
        </details>
      )}
    </Modal>
  )
}

const STALE_RISKS = [
  'This removes data from the graph. Faces named in these photographs, the albums they were in and any date fixed by hand go with them.',
  'If the file was moved rather than deleted, dropping the record throws that history away. Re-ingesting the move is the better fix.',
  'Run the dry run first and read the list.',
  'The cleanup script does not exist yet — the command below is a placeholder.',
]

const ARCHIVE_RISKS = [
  'Files are moved, not copied. They will not be where they are now.',
  'Scans of older prints need --heritage, which asks about each one; without it they are skipped.',
  'Preview with --dry-run before running it for real.',
]

const archiveCommand = (flags) => `cd /home/stephen/Documents/ourkin/workshop

# See what would move, change nothing
mm archive /photos/staging/ -r --dry-run ${flags}

# Same, but only the first hundred
mm archive /photos/staging/ -r -l 100 --dry-run ${flags}

# For real${flags ? `, accepting ${flags}` : ''}
mm archive /photos/staging/ -r -w 6 ${flags}`.replace(/ +$/gm, '')

const staleCommand = () => `cd /home/stephen/Documents/ourkin/api

# Print what would be deleted, change nothing
venv/bin/python scripts/cleanup_stale_media.py --dry-run

# Delete the records and everything attached to them
venv/bin/python scripts/cleanup_stale_media.py --apply`

const Label = ({ children }) => (
  <div style={{ fontSize: 11.5, fontWeight: 500, color: C.muted, marginBottom: 4 }}>
    {children}
  </div>
)

import { useRef } from 'react'
import { AlertCircle, CheckCircle2, Copy, Film, Image as ImageIcon, UploadCloud, X } from 'lucide-react'
import { DESTINATIONS, fileOutcome, isVideoName, useUpload } from '../lib/useUpload'
import { C } from '../ui/tokens'

/**
 * Adding photographs from whatever device they are on.
 *
 * Held for review by default. Dates come out wrong, screenshots get swept up,
 * and the gallery is the thing the whole family opens — so the safe landing
 * place is the default and the other one asks twice.
 */
export function V2UploadPage() {
  const upload = useUpload()
  const input = useRef(null)

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 22, fontWeight: 400, margin: '4px 0 6px' }}>Add photographs</h1>
      <p style={{ fontSize: 12.5, color: C.muted, margin: '0 0 18px' }}>
        From this device — as many at once as you like.
      </p>

      <label
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); upload.add(e.dataTransfer.files) }}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          padding: '44px 20px', borderRadius: 14, cursor: 'pointer', textAlign: 'center',
          border: `2px dashed ${C.border}`, background: C.surface,
        }}
      >
        <UploadCloud size={30} color={C.muted} />
        <span style={{ fontSize: 13.5 }}>Choose files, or drop them here</span>
        <span style={{ fontSize: 12, color: C.muted }}>Photographs and film</span>
        <input
          ref={input}
          type="file"
          multiple
          accept="image/*,video/*"
          style={{ display: 'none' }}
          onChange={e => { upload.add(e.target.files); e.target.value = '' }}
        />
      </label>

      {upload.picked.length > 0 && (
        <section style={{ marginTop: 22 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
            <strong style={{ fontSize: 13.5, fontWeight: 500 }}>
              {upload.picked.length.toLocaleString()} ready to go
            </strong>
            <button type="button" onClick={upload.clear} style={link}>Take them all back off</button>
          </div>

          <div style={{
            display: 'grid', gap: 5, marginBottom: 18,
            gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
          }}>
            {upload.picked.map((item, i) => (
              <div key={`${item.file.name}-${i}`} style={{ position: 'relative' }}>
                {isVideoName(item.file.name) ? (
                  <span style={{
                    display: 'grid', placeItems: 'center', width: '100%', aspectRatio: '1',
                    borderRadius: 9, background: C.hover, color: C.muted,
                  }}>
                    <Film size={18} />
                  </span>
                ) : (
                  <img
                    src={item.url}
                    alt=""
                    style={{
                      width: '100%', aspectRatio: '1', objectFit: 'cover',
                      borderRadius: 9, background: C.hover, display: 'block',
                    }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => upload.drop(i)}
                  aria-label={`Leave out ${item.file.name}`}
                  style={{
                    position: 'absolute', top: -5, right: -5,
                    display: 'grid', placeItems: 'center', width: 19, height: 19,
                    borderRadius: '50%', border: `1px solid ${C.border}`,
                    background: C.bg, color: C.muted, cursor: 'pointer',
                  }}
                >
                  <X size={11} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
            {DESTINATIONS.map(d => {
              const on = upload.destination === d.key
              return (
                <label
                  key={d.key}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12,
                    borderRadius: 11, cursor: 'pointer',
                    border: `1px solid ${on ? C.activeText : C.border}`,
                    background: on ? C.activeBg : C.bg,
                  }}
                >
                  <input
                    type="radio"
                    name="destination"
                    checked={on}
                    onChange={() => upload.setDestination(d.key)}
                    style={{ marginTop: 2, accentColor: C.activeText, cursor: 'pointer' }}
                  />
                  <span>
                    <span style={{ display: 'block', fontSize: 13, color: on ? C.activeText : C.text }}>
                      {d.label}
                    </span>
                    <span style={{ display: 'block', fontSize: 12, color: C.muted, marginTop: 1 }}>
                      {d.hint}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>

          {upload.destination === 'gallery' && (
            <label style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13,
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={upload.confirmed}
                onChange={e => upload.setConfirmed(e.target.checked)}
                style={{ width: 15, height: 15, accentColor: C.activeText, cursor: 'pointer' }}
              />
              Yes — put these in the gallery now.
            </label>
          )}

          <button
            type="button"
            onClick={upload.send}
            disabled={!upload.canSend}
            style={{
              width: '100%', height: 42, borderRadius: 21, fontSize: 13.5,
              border: 0, background: C.activeText, color: '#fff',
              cursor: upload.canSend ? 'pointer' : 'default',
              opacity: upload.canSend ? 1 : 0.45,
            }}
          >
            {upload.busy
              ? 'Sending…'
              : `Send ${upload.picked.length.toLocaleString()} ${upload.picked.length === 1 ? 'file' : 'files'}`}
          </button>
        </section>
      )}

      {upload.job && <Progress upload={upload} />}
    </div>
  )
}

function Progress({ upload }) {
  const { job, summary } = upload
  const finished = job.status === 'done'

  return (
    <section style={{ marginTop: 26 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <strong style={{ fontSize: 13.5, fontWeight: 500 }}>
          {finished ? 'All in' : 'Working through them…'}
        </strong>
        {finished && summary && (
          <span style={{ fontSize: 12, color: C.muted }}>
            {summary.added.toLocaleString()} added
            {summary.duplicate ? ` · ${summary.duplicate} already here` : ''}
            {summary.failed ? ` · ${summary.failed} did not work` : ''}
          </span>
        )}
      </div>

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 11, overflow: 'hidden' }}>
        {job.files.map((file, i) => (
          <div
            key={`${file.filename}-${i}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
              borderTop: i ? `1px solid ${C.border}` : 0,
            }}
          >
            <span style={{
              display: 'grid', placeItems: 'center', width: 38, height: 38, flex: '0 0 auto',
              borderRadius: 7, background: C.hover, overflow: 'hidden', color: C.muted,
            }}>
              {file.thumbnail_url
                ? <img src={file.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (file.is_video ? <Film size={15} /> : <ImageIcon size={15} />)}
            </span>

            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{
                display: 'block', fontSize: 13,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {file.filename}
              </span>
              <span style={{ display: 'block', fontSize: 11.5, color: C.muted }}>
                {fileOutcome(file)}
              </span>
            </span>

            {file.readiness && <Readiness score={file.readiness.score ?? 0} />}
            <Outcome status={file.status} />
          </div>
        ))}
      </div>

      {finished && (
        <button type="button" onClick={upload.clearJob} style={{ ...link, marginTop: 12 }}>
          Add some more
        </button>
      )}
    </section>
  )
}

/**
 * How much the archive could work out about a file on its own — a date, a
 * place. Low is not a failure; it means somebody will have to say when and
 * where, and it is better to know that now than to find it in the gallery
 * filed under 1970.
 */
function Readiness({ score }) {
  const tone = score >= 100 ? { bg: '#e6f4ea', fg: '#137333' }
    : score >= 60 ? { bg: '#fef7e0', fg: '#a15c00' }
      : { bg: '#fce8e6', fg: '#c5221f' }

  return (
    <span style={{
      padding: '2px 8px', borderRadius: 999, fontSize: 11, flex: '0 0 auto',
      background: tone.bg, color: tone.fg,
    }}>
      {score}% known
    </span>
  )
}

function Outcome({ status }) {
  if (status === 'done') return <CheckCircle2 size={17} color="#137333" />
  if (status === 'duplicate') return <Copy size={17} color="#a15c00" />
  if (status === 'error') return <AlertCircle size={17} color="#c5221f" />
  return (
    <span
      className="animate-spin"
      style={{
        width: 15, height: 15, borderRadius: '50%', flex: '0 0 auto',
        border: `2px solid ${C.border}`, borderTopColor: C.muted,
      }}
    />
  )
}

const link = {
  border: 0, background: 'transparent', color: C.activeText,
  fontSize: 12.5, cursor: 'pointer', padding: 0,
}

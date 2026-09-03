import { useState } from 'react'
import { Play } from 'lucide-react'
import { defaultParams } from '../lib/useJobs'
import { C } from './tokens'

/**
 * Starting one job, with its own arguments.
 *
 * Every parameter carries a hint from the job definition, and they are shown
 * rather than hidden behind a tooltip. These jobs rewrite sidecars across
 * 150,000 files; "Force re-run" reads as harmless and means several hours of
 * GPU time, and the only place that is explained is the hint.
 */
export function JobRunner({ job, starting, onStart, onCancel }) {
  const [params, setParams] = useState(() => defaultParams(job))
  const set = (name, value) => setParams(p => ({ ...p, [name]: value }))
  const fields = job.params || []

  return (
    <div style={{
      border: `1px solid ${C.border}`, borderRadius: 12,
      marginBottom: 14, background: C.bg, overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 16px 2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', flex: '0 0 auto',
            background: job.color || C.muted,
          }} />
          <strong style={{ fontSize: 15, fontWeight: 500 }}>{job.name}</strong>
          <code style={{
            padding: '1px 7px', borderRadius: 999, fontSize: 11,
            background: C.surface, color: C.muted,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}>
            {job.id}
          </code>
        </div>

        {job.description && (
          <p style={{ fontSize: 13, color: C.muted, margin: '0 0 12px', maxWidth: '70ch' }}>
            {job.description}
          </p>
        )}

        {/* Set apart with a rule rather than a filled box. These notes run to a
            paragraph — run this after face detection, it takes minutes, skip it
            unless you need search to be current — and as a grey slab they read
            as decoration and get skipped, which is how somebody starts a
            three-hour pass over the whole archive by mistake. */}
        {job.whenToRun && (
          <p style={{
            fontSize: 12.5, color: C.text, margin: '0 0 14px', maxWidth: '70ch',
            padding: '1px 0 1px 12px', borderLeft: `2px solid ${C.border}`,
            lineHeight: 1.55,
          }}>
            {job.whenToRun}
          </p>
        )}

        {fields.length > 0 && (
          <div style={{
            display: 'grid', gap: 10, marginBottom: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          }}>
            {fields.map(p => (
              <label key={p.name} style={{ display: 'block' }}>
                <span style={{ display: 'block', fontSize: 11.5, color: C.muted, marginBottom: 3 }}>
                  {p.label}{p.required ? ' *' : ''}
                </span>

                {p.type === 'flag' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={!!params[p.name]}
                      onChange={e => set(p.name, e.target.checked)}
                      style={{ width: 15, height: 15, accentColor: C.activeText, cursor: 'pointer' }}
                    />
                    {params[p.name] ? 'On' : 'Off'}
                  </span>
                ) : (
                  <input
                    value={params[p.name] ?? ''}
                    onChange={e => set(p.name, e.target.value)}
                    style={field}
                  />
                )}

                {p.hint && (
                  <span style={{ display: 'block', fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>
                    {p.hint}
                  </span>
                )}
              </label>
            ))}
          </div>
        )}

        {/* Folded away. The command is worth having — it is how this gets run
            on a morning the app is down — but it is a wrapped two-line path
            that dominated the card while saying nothing you didn't know from
            the name. */}
        {job.shell_command && (
          <details style={{ marginBottom: 12 }}>
            <summary style={{ fontSize: 11.5, color: C.muted, cursor: 'pointer' }}>
              The command it runs
            </summary>
            <pre style={{
              margin: '8px 0 0', padding: '10px 12px', borderRadius: 8,
              background: '#18181b', color: '#e4e4e7',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 11.5, lineHeight: 1.6,
              overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {job.shell_command}
            </pre>
          </details>
        )}
      </div>

      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: 8,
        padding: '12px 16px', borderTop: `1px solid ${C.border}`,
        background: C.surface,
      }}>
        <button type="button" onClick={onCancel} style={ghost}>Cancel</button>
        <button
          type="button"
          onClick={() => onStart(job, params)}
          disabled={starting}
          style={{ ...primary, opacity: starting ? 0.5 : 1 }}
        >
          <Play size={14} /> {starting ? 'Starting…' : 'Run it'}
        </button>
      </div>
    </div>
  )
}

const field = {
  width: '100%', boxSizing: 'border-box', height: 32, padding: '0 10px',
  border: `1px solid ${C.border}`, borderRadius: 8,
  font: 'inherit', fontSize: 13, color: C.text, background: C.bg,
}
const ghost = {
  height: 32, padding: '0 14px', borderRadius: 16, fontSize: 12.5,
  border: `1px solid ${C.border}`, background: 'transparent',
  color: C.text, cursor: 'pointer',
}
const primary = {
  display: 'inline-flex', alignItems: 'center', gap: 7,
  height: 32, padding: '0 16px', borderRadius: 16, fontSize: 12.5,
  border: 0, background: C.activeText, color: '#fff', cursor: 'pointer',
}

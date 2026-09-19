import { useState } from 'react'
import { X } from 'lucide-react'
import { JobRunner } from '../ui/JobRunner'
import { LoadingDots } from '../ui/LoadingDots'
import { useJobs, useRunLog, runDuration } from '../lib/useJobs'
import { useToast } from '../components/Toast'
import { C } from '../ui/tokens'

/**
 * The back-of-house jobs and what they have been doing.
 *
 * These are the only controls in the app that spend hours of machine time and
 * rewrite files across the archive, so the page leads with what has run rather
 * than with what could be run: the useful question here is almost always "did
 * last night's pass finish", not "start another".
 */
export function JobsPage() {
  const { jobs, runs, loading, starting, start } = useJobs()
  const { toast } = useToast()
  const [running, setRunning] = useState(null)     // job being configured
  const [logRun, setLogRun] = useState(null)
  const [filter, setFilter] = useState(null)       // job_id

  if (loading) return <LoadingDots />

  const shown = filter ? runs.filter(r => r.job_id === filter) : runs
  const active = runs.filter(r => r.status === 'running')

  async function go(job, params) {
    try {
      await start(job, params)
      toast.success(`${job.name} started`)
      setRunning(null)
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '4px 0 14px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, margin: 0 }}>Jobs</h1>
        {active.length > 0 && (
          <span style={{ fontSize: 13, color: C.activeText }}>
            {active.length} running
          </span>
        )}
      </div>

      {running && (
        <JobRunner
          job={running}
          starting={starting}
          onStart={go}
          onCancel={() => setRunning(null)}
        />
      )}

      <section style={{ marginBottom: 24 }}>
        <h2 style={label}>Start something</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {jobs.map(job => (
            <button
              key={job.id}
              type="button"
              onClick={() => setRunning(running?.id === job.id ? null : job)}
              title={job.description}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                height: 32, padding: '0 12px', borderRadius: 16, fontSize: 12.5,
                border: `1px solid ${running?.id === job.id ? C.activeText : C.border}`,
                background: running?.id === job.id ? C.activeBg : C.bg,
                color: running?.id === job.id ? C.activeText : C.text,
                cursor: 'pointer',
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: job.color || C.muted,
              }} />
              {job.name}
            </button>
          ))}
        </div>
      </section>

      <section>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
          <h2 style={{ ...label, margin: 0 }}>Recent runs</h2>
          {filter && (
            <button type="button" onClick={() => setFilter(null)} style={linkish}>
              Showing {filter} — show all
            </button>
          )}
        </div>

        {shown.length === 0 && <p style={muted}>Nothing has run yet.</p>}

        {shown.map(run => (
          <RunRow
            key={run.id}
            run={run}
            onFilter={() => setFilter(run.job_id)}
            onLog={() => setLogRun(run)}
          />
        ))}
      </section>

      {logRun && <LogViewer run={logRun} onClose={() => setLogRun(null)} />}
    </div>
  )
}

function RunRow({ run, onFilter, onLog }) {
  const [lit, setLit] = useState(false)
  return (
    <div
      onMouseEnter={() => setLit(true)}
      onMouseLeave={() => setLit(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '7px 8px', borderRadius: 8,
        background: lit ? C.hover : 'transparent',
      }}
    >
      <Status status={run.status} />
      <button type="button" onClick={onFilter} style={{ ...linkish, minWidth: 0, flex: 1, textAlign: 'left' }}>
        {run.job_name || run.job_id}
      </button>
      <span style={{ fontSize: 11.5, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
        {(run.started_at || '').slice(0, 16).replace('T', ' ')}
      </span>
      <span style={{ fontSize: 11.5, color: C.muted, width: 70, textAlign: 'right' }}>
        {runDuration(run)}
      </span>
      <button type="button" onClick={onLog} style={ghost}>Log</button>
    </div>
  )
}

function Status({ status }) {
  const tone = {
    running: { bg: '#e8f0fe', fg: '#0b57d0', text: 'Running' },
    finished: { bg: '#e6f4ea', fg: '#137333', text: 'Done' },
    failed: { bg: '#fce8e6', fg: '#c5221f', text: 'Failed' },
  }[status] || { bg: C.surface, fg: C.muted, text: status || 'Unknown' }

  return (
    <span style={{
      padding: '2px 8px', borderRadius: 999, fontSize: 11,
      background: tone.bg, color: tone.fg, flex: '0 0 auto', minWidth: 58,
      textAlign: 'center',
    }}>
      {tone.text}
    </span>
  )
}

function LogViewer({ run, onClose }) {
  const { text, done } = useRunLog(run.id)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1400, padding: 16,
      background: 'rgba(32,33,36,.5)', display: 'grid', placeItems: 'center',
    }}>
      <div style={{
        width: 'min(900px, 96vw)', height: 'min(80vh, 700px)',
        display: 'flex', flexDirection: 'column',
        background: C.bg, borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,.25)',
      }}>
        <header style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderBottom: `1px solid ${C.border}`,
        }}>
          <Status status={run.status} />
          <strong style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>
            {run.job_name || run.job_id}
          </strong>
          {!done && <span style={{ fontSize: 11.5, color: C.muted }}>following…</span>}
          <button type="button" onClick={onClose} aria-label="Close" style={ghost}>
            <X size={15} />
          </button>
        </header>

        {/* Monospace and dark, because it is a terminal log and every tool that
            wrote it assumed one. */}
        <pre style={{
          flex: 1, margin: 0, padding: 14, overflow: 'auto',
          background: '#18181b', color: '#e4e4e7',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 11.5, lineHeight: 1.5, whiteSpace: 'pre-wrap',
        }}>
          {text || 'Waiting for output…'}
        </pre>
      </div>
    </div>
  )
}

const label = { fontSize: 11.5, fontWeight: 500, color: C.muted, margin: '0 0 8px' }
const muted = { fontSize: 12.5, color: C.muted, margin: 0 }
const linkish = {
  border: 0, background: 'transparent', color: C.activeText,
  fontSize: 12.5, cursor: 'pointer', padding: 0,
}
const ghost = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  height: 26, padding: '0 10px', borderRadius: 13, fontSize: 11.5,
  border: `1px solid ${C.border}`, background: 'transparent',
  color: C.text, cursor: 'pointer',
}

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Play, ListChecks, Info } from 'lucide-react'
import { Button } from '../components/Button'
import { Container } from '../components/Container'
import { Drawer } from '../components/Drawer'
import { Input } from '../components/Input'
import { Label } from '../components/Label'
import { ProgressBar } from '../components/ProgressBar'
import { Tag } from '../components/Tag'
import { HeaderTrailingPortal } from '../components/HeaderTrailingPortal'

const API = '/api/jobs'  // Vite proxy strips /api → FastAPI sees /jobs

const STATUS_TONE = {
  running:   'blue',
  completed: 'green',
  completed_with_warnings: 'amber',
  failed:    'red',
  cancelled: 'slate',
  queued:    'amber',
  unknown:   'amber',
}

// Friendlier labels for statuses whose raw value is ugly/long.
const STATUS_LABEL = {
  unknown: 'running',
  completed_with_warnings: 'completed ⚠',
}

function StatusTag({ status }) {
  const tone = STATUS_TONE[status === 'unknown' ? 'running' : status] || 'slate'
  const display = STATUS_LABEL[status] || status
  return (
    <Tag tone={tone} className="uppercase tracking-wider">{display}</Tag>
  )
}

function JobList({ jobs, selected, onSelect }) {
  return (
    <div className="flex flex-col">
      {jobs.map(job => (
        <button
          key={job.id}
          onClick={() => onSelect(job)}
          className={
            'border-b border-white/5 border-l-2 px-4 py-3 text-left transition-colors ' +
            (selected?.id === job.id
              ? 'border-l-blue-500 bg-blue-900/20'
              : 'border-l-transparent hover:bg-white/5')
          }
        >
          <div className="flex items-center gap-2 text-[13px] font-medium text-white/90">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: job.color || '#6b7280' }} />
            {job.name}
          </div>
          <div className="mt-0.5 text-[11px] leading-snug text-white/35">{job.description}</div>
        </button>
      ))}
    </div>
  )
}

function duration(run) {
  if (!run.started_at) return ''
  const end = run.finished_at ? new Date(run.finished_at) : new Date()
  const s = Math.round((end - new Date(run.started_at)) / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${s % 60}s`
}

function parseProgress(line) {
  if (!line) return null
  const mBracket = line.match(/\[\s*(\d+)\/(\d+)\]/)
  const mSlash   = line.match(/\b(\d[\d,]*)\/(\d[\d,]*)/)
  const m = mBracket || mSlash
  if (!m) return null
  const cur = parseInt(m[1].replace(/,/g, ''))
  const tot = parseInt(m[2].replace(/,/g, ''))
  const pct = Math.min(100, (cur / tot) * 100)
  return { cur, tot, pct }
}

export function JobsPage() {
  const [jobs, setJobs]           = useState([])
  const [runs, setRuns]           = useState([])
  const [selected, setSelected]   = useState(null)
  const [params, setParams]       = useState({})
  const [starting, setStarting]   = useState(false)
  const [logRun, setLogRun]       = useState(null)
  const [logText, setLogText]     = useState('')
  const [logDone, setLogDone]     = useState(false)
  const logOffsetRef              = useRef(0)
  const logPollRef                = useRef(null)
  const logBodyRef                = useRef(null)
  const runsIntervalRef           = useRef(null)

  const refreshRuns = useCallback(async () => {
    const r = await fetch(`${API}/runs`).then(r => r.json()).catch(() => [])
    setRuns(Array.isArray(r) ? r : [])
  }, [])

  useEffect(() => {
    Promise.all([
      fetch(API).then(r => r.json()).catch(() => []),
      fetch(`${API}/runs`).then(r => r.json()).catch(() => []),
    ]).then(([j, r]) => {
      setJobs(Array.isArray(j) ? j : [])
      setRuns(Array.isArray(r) ? r : [])
    })
    runsIntervalRef.current = setInterval(refreshRuns, 5000)
    return () => clearInterval(runsIntervalRef.current)
  }, [refreshRuns])

  function selectJob(job) {
    setSelected(job)
    const defaults = {}
    for (const p of job.params || []) defaults[p.name] = p.default ?? ''
    setParams(defaults)
  }

  async function startRun() {
    if (!selected) return
    setStarting(true)
    const res = await fetch(`${API}/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: selected.id, params }),
    })
    setStarting(false)
    if (res.ok) {
      const run = await res.json()
      setRuns(prev => [run, ...prev])
      openLog(run)
    }
  }

  const pollLog = useCallback(async (runId) => {
    if (!runId) return
    try {
      const [logRes, runRes] = await Promise.all([
        fetch(`${API}/runs/${runId}/log?offset=${logOffsetRef.current}`),
        fetch(`${API}/runs/${runId}`),
      ])
      const logData = await logRes.json()
      const run     = await runRes.json()

      if (logData.content) {
        setLogText(prev => prev + logData.content)
        logOffsetRef.current = logData.offset
        if (logBodyRef.current) {
          const el = logBodyRef.current
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
          if (atBottom) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight })
        }
      }

      setLogRun(run)
      if (logData.done || ['completed', 'completed_with_warnings', 'failed', 'cancelled'].includes(run.status)) {
        setLogDone(true)
        refreshRuns()
        return
      }
    } catch { }
    logPollRef.current = setTimeout(() => pollLog(runId), 1500)
  }, [refreshRuns])

  function openLog(run) {
    clearTimeout(logPollRef.current)
    logOffsetRef.current = 0
    setLogText('')
    setLogDone(false)
    setLogRun(run)
    setTimeout(() => pollLog(run.id), 50)
  }

  function closeLog() {
    clearTimeout(logPollRef.current)
    setLogRun(null)
  }

  async function cancelRun() {
    if (!logRun || !confirm('Cancel this run?')) return
    await fetch(`${API}/runs/${logRun.id}/cancel`, { method: 'POST' })
    setLogRun(r => ({ ...r, status: 'cancelled' }))
    setLogDone(true)
    refreshRuns()
  }

  async function dismissRun(runId, e) {
    e.stopPropagation()
    await fetch(`${API}/runs/${runId}/dismiss`, { method: 'POST' })
    setRuns(prev => prev.map(r => r.id === runId ? { ...r, status: 'completed' } : r))
  }

  const sortedRuns = [...runs].sort((a, b) => {
    const order = { running: 0, queued: 1, unknown: 2, failed: 3, cancelled: 4, completed_with_warnings: 5, completed: 6 }
    const sd = (order[a.status] ?? 5) - (order[b.status] ?? 5)
    return sd !== 0 ? sd : (b.started_at || '').localeCompare(a.started_at || '')
  })

  const visibleRuns = selected
    ? sortedRuns.filter(r => r.job_id === selected.id)
    : sortedRuns

  const activeCount = runs.filter(r => r.status === 'running' || r.status === 'queued' || r.status === 'unknown').length
  const [jobsOpen, setJobsOpen] = useState(false)

  function handleSelect(job) {
    selectJob(job)
    setJobsOpen(false)
  }

  return (
    <>
      <HeaderTrailingPortal>
        {activeCount > 0 && <Tag tone="blue">{activeCount} running</Tag>}
        <button
          onClick={() => setJobsOpen(true)}
          aria-label="Available jobs"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white md:hidden"
        >
          <ListChecks size={18} />
        </button>
      </HeaderTrailingPortal>

      <Drawer open={jobsOpen} onClose={() => setJobsOpen(false)} title="Available Jobs">
        <JobList jobs={jobs} selected={selected} onSelect={handleSelect} />
      </Drawer>

      <div className="flex h-[calc(100vh-var(--app-header-h,3rem))] overflow-hidden">
        {/* Sidebar (desktop only) */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-white/5 overflow-hidden md:flex">
          <div className="shrink-0 border-b border-white/5 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-white/30">
            Available Jobs
          </div>
          <div className="flex-1 overflow-y-auto">
            <JobList jobs={jobs} selected={selected} onSelect={handleSelect} />
          </div>
        </aside>

        {/* Center */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {!selected ? (
            <div className="px-6 py-10 text-sm text-white/25">Select a job to configure and run it</div>
          ) : (
            <div className="shrink-0 border-b border-white/5">
              <Container className="py-5">
                <div className="mb-1 text-[15px] font-semibold text-white">{selected.name}</div>
                <div className="mb-4 text-[12px] text-white/40">{selected.description}</div>
                {selected.whenToRun && (
                  <div className="mb-4 flex gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2.5 text-[12px] leading-relaxed text-white/70">
                    <Info size={14} className="mt-0.5 shrink-0 text-blue-400/80" />
                    <div><span className="font-medium text-blue-300/90">When to run:</span> {selected.whenToRun}</div>
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  {(selected.params || []).map(p => {
                    // Conditional visibility: hide unless show_if condition is met
                    if (p.show_if) {
                      const dep = params[p.show_if.name]
                      if (dep !== p.show_if.equals) return null
                    }
                    return (
                      <div key={p.name} className="flex items-start gap-3">
                        <Label className="!mb-0 w-32 shrink-0 pt-1.5">
                          {p.label}{p.required && ' *'}
                        </Label>
                        {p.type === 'flag' ? (
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="checkbox"
                              checked={!!params[p.name]}
                              onChange={e => setParams(prev => ({ ...prev, [p.name]: e.target.checked }))}
                              className="h-4 w-4 cursor-pointer accent-blue-500"
                            />
                            {p.hint && <span className="text-[11px] text-white/30">{p.hint}</span>}
                          </div>
                        ) : (
                          <div className="flex flex-1 flex-col gap-1">
                            <Input
                              value={params[p.name] ?? ''}
                              onChange={e => setParams(prev => ({ ...prev, [p.name]: e.target.value }))}
                            />
                            {p.hint && <span className="text-[11px] text-white/30">{p.hint}</span>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4">
                  <Button onClick={startRun} disabled={starting}>
                    <Play size={13} /> {starting ? 'Starting…' : 'Run'}
                  </Button>
                </div>
              </Container>
            </div>
          )}

          {/* Run history */}
          <div className="flex-1 overflow-y-auto">
            <div className="sticky top-0 z-10 border-b border-white/5 bg-black px-6 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
              Run History{selected && ` — ${selected.name}`}
            </div>
            {visibleRuns.length === 0 ? (
              <div className="px-6 py-6 text-[13px] text-white/25">No runs yet</div>
            ) : visibleRuns.map(run => {
              const progress = parseProgress(run.last_line)
              const tone = STATUS_TONE[run.status === 'unknown' ? 'running' : run.status] || 'blue'
              return (
                <button
                  key={run.id}
                  onClick={() => openLog(run)}
                  className={
                    'flex w-full items-start gap-3 border-b border-white/5 px-6 py-3 text-left transition-colors hover:bg-white/5 ' +
                    (logRun?.id === run.id ? 'bg-blue-900/20' : '')
                  }
                >
                  <StatusTag status={run.status} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-white/90">{run.job_name}</div>
                    <div className="mt-0.5 text-[11px] text-white/30">
                      {run.started_at?.replace('T', ' ') || '—'}
                      {duration(run) ? ` · ${duration(run)}` : ''}
                      {' · '}#{run.id}
                    </div>
                    {progress ? (
                      <div className="mt-1.5">
                        <ProgressBar pct={progress.pct} cur={progress.cur} tot={progress.tot} tone={tone} size="sm" showPct showCounts />
                      </div>
                    ) : run.last_line ? (
                      <div className="mt-1 truncate text-[11px] text-white/25">{run.last_line}</div>
                    ) : null}
                  </div>
                  {run.status === 'unknown' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={e => dismissRun(run.id, e)}
                      className="shrink-0"
                    >
                      Mark done
                    </Button>
                  )}
                </button>
              )
            })}
          </div>
        </main>
      </div>

      {/* Log modal */}
      {logRun && (
        <div
          className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/75"
          onClick={e => e.target === e.currentTarget && closeLog()}
        >
          <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0d0d0d] md:h-[80vh] md:w-[860px] md:max-w-[95vw] md:rounded-xl md:border md:border-white/10">
            <div className="flex shrink-0 items-center gap-3 border-b border-white/10 p-3">
              <span className="flex-1 text-sm font-medium text-white/85">{logRun.job_name}</span>
              <StatusTag status={logRun.status} />
              {!logDone && logRun.status === 'running' && (
                <Button size="sm" variant="secondary" onClick={cancelRun}>Cancel</Button>
              )}
              <button
                onClick={closeLog}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div
              ref={logBodyRef}
              className="flex-1 overflow-y-auto whitespace-pre-wrap break-all p-4 font-mono text-[12px] leading-relaxed text-white/70"
            >
              {logText || <span className="text-white/20">Waiting for output…</span>}
            </div>
            <div className="flex shrink-0 items-center gap-3 border-t border-white/10 p-2.5">
              <span className={'flex-1 text-[12px] ' + (logDone ? 'text-white/30' : 'animate-pulse text-blue-400')}>
                {logDone
                  ? `Finished · exit code ${logRun.exit_code ?? '—'}`
                  : 'Running…'}
              </span>
              <button
                onClick={() => { if (logBodyRef.current) logBodyRef.current.scrollTop = logBodyRef.current.scrollHeight }}
                className="text-[12px] text-white/30 transition-colors hover:text-white/60"
              >
                ↓ Bottom
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

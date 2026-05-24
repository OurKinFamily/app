import { useState, useEffect, useRef, useCallback } from 'react'

const API = '/api/jobs'  // Vite proxy strips /api → FastAPI sees /jobs

const BADGE = {
  running:   'bg-blue-900/50 text-blue-400',
  completed: 'bg-green-900/50 text-green-400',
  failed:    'bg-red-900/50 text-red-400',
  cancelled: 'bg-zinc-800 text-zinc-400',
  queued:    'bg-zinc-800 text-yellow-400',
  unknown:   'bg-yellow-900/20 text-yellow-600',
}

function Badge({ status }) {
  const display = status === 'unknown' ? 'running' : status
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0 ${BADGE[display] || BADGE.queued}`}>
      {display}
    </span>
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

  // ── Log modal ──

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
      if (logData.done || ['completed', 'failed', 'cancelled'].includes(run.status)) {
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

  // ── Render ──

  const sortedRuns = [...runs].sort((a, b) => {
    const order = { running: 0, queued: 1, unknown: 2, failed: 3, cancelled: 4, completed: 5 }
    const sd = (order[a.status] ?? 5) - (order[b.status] ?? 5)
    return sd !== 0 ? sd : (b.started_at || '').localeCompare(a.started_at || '')
  })

  return (
    <div className="flex h-screen overflow-hidden">

      {/* Job list */}
      <div className="w-64 min-w-[256px] border-r border-white/10 flex flex-col overflow-hidden">
        <div className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/25 border-b border-white/10 flex-shrink-0">
          Available Jobs
        </div>
        <div className="overflow-y-auto flex-1">
          {jobs.map(job => (
            <div
              key={job.id}
              onClick={() => selectJob(job)}
              className={`px-4 py-3 cursor-pointer border-b border-white/5 border-l-2 transition-colors ${
                selected?.id === job.id
                  ? 'bg-blue-900/20 border-l-blue-500'
                  : 'border-l-transparent hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2 text-[13px] font-medium text-white/90">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: job.color || '#6b7280' }} />
                {job.name}
              </div>
              <div className="text-[11px] text-white/35 mt-0.5 leading-snug">{job.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Center */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Form / empty state */}
        {!selected ? (
          <div className="flex-shrink-0 px-6 py-10 text-white/25 text-sm">Select a job to configure and run it</div>
        ) : (
          <div className="flex-shrink-0 px-6 py-5 border-b border-white/10">
            <div className="text-[15px] font-semibold text-white mb-1">{selected.name}</div>
            <div className="text-[12px] text-white/40 mb-4">{selected.description}</div>
            <div className="flex flex-col gap-3">
              {(selected.params || []).map(p => (
                <div key={p.name} className="flex items-start gap-3">
                  <label className="text-[12px] text-white/40 w-32 flex-shrink-0 pt-1.5">
                    {p.label}{p.required && ' *'}
                  </label>
                  {p.type === 'flag' ? (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        checked={!!params[p.name]}
                        onChange={e => setParams(prev => ({ ...prev, [p.name]: e.target.checked }))}
                        className="w-4 h-4 cursor-pointer accent-blue-500"
                      />
                      {p.hint && <span className="text-[11px] text-white/20">{p.hint}</span>}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 flex-1">
                      <input
                        type="text"
                        value={params[p.name] ?? ''}
                        onChange={e => setParams(prev => ({ ...prev, [p.name]: e.target.value }))}
                        className="bg-white/5 border border-white/10 rounded-md text-white text-[13px] px-3 py-1.5 outline-none focus:border-blue-500 transition-colors"
                      />
                      {p.hint && <span className="text-[11px] text-white/20">{p.hint}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4">
              <button
                onClick={startRun}
                disabled={starting}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[13px] font-medium rounded-md transition-colors"
              >
                {starting ? 'Starting…' : '▶ Run'}
              </button>
            </div>
          </div>
        )}

        {/* Run history */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/25 border-b border-white/10 sticky top-0 bg-black z-10">
            Run History
          </div>
          {sortedRuns.length === 0 ? (
            <div className="px-6 py-6 text-[13px] text-white/25">No runs yet</div>
          ) : sortedRuns.map(run => {
            const progress = parseProgress(run.last_line)
            return (
              <div
                key={run.id}
                onClick={() => openLog(run)}
                className={`flex items-start gap-3 px-6 py-3 border-b border-white/5 cursor-pointer transition-colors hover:bg-white/5 ${logRun?.id === run.id ? 'bg-blue-900/20' : ''}`}
              >
                <Badge status={run.status} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-white/90">{run.job_name}</div>
                  <div className="text-[11px] text-white/30 mt-0.5">
                    {run.started_at?.replace('T', ' ') || '—'}
                    {duration(run) ? ` · ${duration(run)}` : ''}
                    {' · '}#{run.id}
                  </div>
                  {progress ? (
                    <>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-blue-900/30 border border-blue-900 text-blue-400">{progress.pct.toFixed(1)}%</span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-green-900/30 border border-green-900 text-green-400">{progress.cur.toLocaleString()} / {progress.tot.toLocaleString()}</span>
                      </div>
                      <div className="mt-1.5 h-0.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${progress.pct}%` }} />
                      </div>
                    </>
                  ) : run.last_line ? (
                    <div className="text-[11px] text-white/25 mt-1 truncate">{run.last_line}</div>
                  ) : null}
                </div>
                {run.status === 'unknown' && (
                  <button
                    onClick={e => dismissRun(run.id, e)}
                    className="text-[11px] text-white/30 hover:text-white/60 px-2 py-0.5 rounded border border-white/10 hover:border-white/20 flex-shrink-0 transition-colors"
                  >
                    Mark done
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Log modal */}
      {logRun && (
        <div
          className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center"
          onClick={e => e.target === e.currentTarget && closeLog()}
        >
          <div className="bg-[#0d0d0d] border border-white/10 rounded-xl w-[860px] max-w-[95vw] h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-shrink-0">
              <span className="text-[14px] font-semibold text-white flex-1">{logRun.job_name}</span>
              <Badge status={logRun.status} />
              {!logDone && logRun.status === 'running' && (
                <button
                  onClick={cancelRun}
                  className="text-[12px] text-white/40 hover:text-white/70 px-2 py-0.5 rounded border border-white/10 hover:border-white/20 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button onClick={closeLog} className="text-white/30 hover:text-white/70 text-lg leading-none px-1 transition-colors">✕</button>
            </div>
            <div
              ref={logBodyRef}
              className="flex-1 overflow-y-auto p-4 font-mono text-[12px] text-white/70 leading-relaxed whitespace-pre-wrap break-all"
            >
              {logText || <span className="text-white/20">Waiting for output…</span>}
            </div>
            <div className="flex items-center gap-3 px-4 py-2.5 border-t border-white/10 flex-shrink-0">
              <span className={`text-[12px] flex-1 ${logDone ? 'text-white/30' : 'text-blue-400 animate-pulse'}`}>
                {logDone
                  ? `Finished · exit code ${logRun.exit_code ?? '—'}`
                  : 'Running…'}
              </span>
              <button
                onClick={() => { if (logBodyRef.current) logBodyRef.current.scrollTop = logBodyRef.current.scrollHeight }}
                className="text-[12px] text-white/30 hover:text-white/60 transition-colors"
              >
                ↓ Bottom
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

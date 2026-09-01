import { useEffect, useState } from 'react'
import { Container } from '../components/Container'
import { mediaUrl } from '../lib/media'

const HUE_COLOR = {
  // Reds & warms
  maroon:   '#7f1d1d',
  red:      '#ef4444',
  scarlet:  '#dc2626',
  brown:    '#78350f',
  tan:      '#d6bcab',
  peach:    '#fbbf94',
  orange:   '#f97316',
  goldenrod:'#ca8a04',
  yellow:   '#eab308',
  olive:    '#65733f',
  // Greens
  lime:     '#a3e635',
  green:    '#22c55e',
  forest:   '#166534',
  // Teals / cyans / sky
  teal:     '#14b8a6',
  cyan:     '#06b6d4',
  sky:      '#7dd3fc',
  // Blues / purples
  blue:     '#3b82f6',
  navy:     '#1e3a8a',
  indigo:   '#6366f1',
  violet:   '#a855f7',
  magenta:  '#d946ef',
  pink:     '#ec4899',
  // Neutrals
  white:    '#f4f4f5',
  pale:     '#e7e5e4',
  gray:     '#94a3b8',
  black:    '#1f2937',
  mixed:    '#6b7280',
}

const BRIGHTNESS_COLOR = { dark: '#1f2937', mid: '#71717a', bright: '#f4f4f5' }

function fmt(n) {
  if (n == null) return '—'
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toLocaleString()
}

function relTime(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const sec = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (sec < 60)         return `${sec} second${sec === 1 ? '' : 's'} ago`
  const min = Math.round(sec / 60)
  if (min < 60)         return `${min} minute${min === 1 ? '' : 's'} ago`
  const hr = Math.round(min / 60)
  if (hr < 24)          return `${hr} hour${hr === 1 ? '' : 's'} ago`
  const days = Math.round(hr / 24)
  if (days < 30)        return `${days} day${days === 1 ? '' : 's'} ago`
  const mo = Math.round(days / 30)
  if (mo < 12)          return `${mo} month${mo === 1 ? '' : 's'} ago`
  const yr = Math.round(mo / 12)
  return `${yr} year${yr === 1 ? '' : 's'} ago`
}

function Var({ children }) {
  return (
    <span className="inline-flex items-center rounded border border-stone-500/30 bg-stone-500/15 px-1.5 py-px font-mono text-[11px] text-stone-300">
      {children}
    </span>
  )
}

function HuePill({ hue, count, total, samples, onClick }) {
  const fallback = HUE_COLOR[hue] || HUE_COLOR.mixed
  const p = total ? (count / total) * 100 : 0
  const [c_min, c_33, c_66, c_max] = samples && samples.length === 4
    ? samples
    : [fallback, fallback, fallback, fallback]
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-lg border border-white/8 bg-white/3 p-2 pb-1.5 text-left transition-colors hover:border-white/20 hover:bg-white/8 sm:p-3"
    >
      <div className="grid grid-cols-2 items-center gap-2 sm:gap-3">
        <span className="block aspect-square overflow-hidden rounded ring-1 ring-white/15">
          <span className="grid h-full w-full grid-cols-2 grid-rows-2">
            <span style={{ background: c_max }} />
            <span style={{ background: c_66 }} />
            <span style={{ background: c_33 }} />
            <span style={{ background: c_min }} />
          </span>
        </span>
        <div className="min-w-0 text-right">
          <div className="text-sm font-bold leading-none tabular-nums text-white/85 sm:text-xl">
            {p.toFixed(1)}<span className="ml-0.5 text-[10px] text-white/40 sm:text-sm">%</span>
          </div>
          <div className="mt-0.5 text-[10px] text-white/35 tabular-nums sm:text-[11px]">{fmt(count)}</div>
        </div>
      </div>
    </button>
  )
}

function StatTile({ label, value, sub, onClick }) {
  const base = 'flex flex-col items-center justify-center gap-1.5 rounded-lg border border-white/8 bg-white/3 p-2 text-center [container-type:inline-size]'
  const body = (
    <>
      <div className="text-[10px] uppercase tracking-wider text-white/35">{label}</div>
      <div className="break-words font-semibold leading-tight text-white [font-size:clamp(14px,8cqi,22px)]">
        {value}
      </div>
      {sub && <div className="text-[10px] text-white/35">{sub}</div>}
    </>
  )
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${base} w-full transition-colors hover:border-white/20 hover:bg-white/8`}
      >
        {body}
      </button>
    )
  }
  return <div className={base}>{body}</div>
}


function StatSection({ title, subtitle, children, cols = 'three' }) {
  // Tailwind purge can't see template-literal class names so the cols
  // variants are baked here as full classes.
  const GRID = {
    three: 'grid gap-2 grid-cols-3',
    four:  'grid gap-2 grid-cols-2 sm:grid-cols-4',
    six:   'grid gap-2 grid-cols-3 sm:grid-cols-6',
  }
  return (
    <section>
      <div className="mb-3 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">{title}</h2>
        {subtitle && <span className="text-[11px] text-white/30">{subtitle}</span>}
      </div>
      <div className={GRID[cols] || GRID.three}>
        {children}
      </div>
    </section>
  )
}


function PeopleLeaderboardBody({ buckets, onClick, limit }) {
  if (buckets === null) return <p className="text-[12px] text-white/30">Loading…</p>
  if (buckets.length === 0) return null
  const rows = buckets.slice(0, limit ?? buckets.length)
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {rows.map((b, i) => (
        <button
          key={b.key}
          type="button"
          onClick={() => onClick(b)}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border border-white/8 bg-white/3 p-3 text-center transition-colors hover:border-white/20 hover:bg-white/8 [container-type:inline-size]"
        >
          <div className="text-[10px] uppercase tracking-wider text-white/35">#{i + 1}</div>
          {b.avatar && (
            <img
              src={mediaUrl(b.avatar)}
              alt=""
              className="h-12 w-12 rounded-full object-cover ring-1 ring-white/15 sm:h-14 sm:w-14"
            />
          )}
          <div className="break-words font-semibold leading-tight text-white [font-size:clamp(10px,7cqi,14px)]">
            {b.label}
          </div>
          <div className="text-[10px] text-white/35 tabular-nums">{fmt(b.count)} photos</div>
        </button>
      ))}
    </div>
  )
}


function TopCardGridBody({ buckets, onClick }) {
  if (buckets === null) return <p className="text-[12px] text-white/30">Loading…</p>
  if (buckets.length === 0) return null
  return (
    <div className="grid grid-cols-3 gap-2">
      {buckets.slice(0, 3).map(b => (
        <button
          key={b.key}
          type="button"
          onClick={() => onClick(b)}
          className="flex flex-col items-center justify-center gap-1 rounded-lg border border-white/8 bg-white/3 p-3 text-center transition-colors hover:border-white/20 hover:bg-white/8 [container-type:inline-size]"
        >
          {b.sub && <div className="text-[10px] uppercase tracking-wider text-white/35">{b.sub}</div>}
          <div className="break-words font-semibold leading-tight text-white [font-size:clamp(10px,7cqi,15px)]">{b.label}</div>
        </button>
      ))}
    </div>
  )
}


function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">{title}</h2>
        {subtitle && <span className="text-[11px] text-white/30">{subtitle}</span>}
      </div>
      {action}
    </div>
  )
}


// Composable expand/collapse section. Pass collapsed view + expanded view.
// Title + MORE/LESS link rendered once by the section, not inside children.
function ExpandableSection({ title, collapsedSubtitle, expandedSubtitle, expanded, onToggle, collapsed, expandedContent }) {
  return (
    <section>
      <SectionHeader
        title={title}
        subtitle={expanded ? expandedSubtitle : collapsedSubtitle}
        action={
          <button
            type="button"
            onClick={onToggle}
            className="text-[10px] uppercase tracking-wider text-white/50 underline decoration-white/15 underline-offset-2 hover:text-white"
          >
            {expanded ? 'LESS' : 'MORE'}
          </button>
        }
      />
      {expanded ? expandedContent : collapsed}
    </section>
  )
}


// Generic 3-card grid for top-N aspects (camera / location / decade).
function TopCardGrid({ buckets, onClick, title, subtitle }) {
  return (
    <section>
      <SectionHeader title={title} subtitle={subtitle} />
      <TopCardGridBody buckets={buckets} onClick={onClick} />
    </section>
  )
}


function BarBucketBody({ buckets, onClick }) {
  if (!buckets) return <p className="text-[12px] text-white/30">Loading…</p>
  if (buckets.length === 0) return null

  const max = Math.max(...buckets.map(b => b.count))
  const widthPct = count => max ? (count / max) * 100 : 0
  // Long lists (hours = 24, decades = 12+) flip to a column chart so
  // we don't eat half the page with horizontal bars.
  const vertical = buckets.length > 10

  if (vertical) {
    return (
      <div className="flex h-40 items-stretch gap-0.5 rounded border border-white/8 bg-white/3 p-2">
        {buckets.map(b => {
          const p = widthPct(b.count)
          return (
            <button
              key={b.key}
              type="button"
              onClick={() => onClick(b)}
              title={`${b.label} · ${b.count.toLocaleString()}`}
              className="group flex h-full flex-1 flex-col items-center gap-1"
            >
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t bg-purple-500/55 transition-colors group-hover:bg-purple-400/80"
                  style={{ height: `${p}%` }}
                />
              </div>
              <span className="text-[9px] tabular-nums text-white/40 group-hover:text-white/70">
                {b.label.split(':')[0]}
              </span>
            </button>
          )
        })}
      </div>
    )
  }
  return (
    <div className="space-y-1">
      {buckets.map(b => {
        const p = max ? (b.count / max) * 100 : 0
        return (
          <button
            key={b.key}
            type="button"
            onClick={() => onClick(b)}
            className="grid w-full grid-cols-[60px_1fr_70px] items-center gap-3 rounded px-1 text-left text-[12px] transition-colors hover:bg-white/5"
          >
            <span className="truncate font-medium text-white/65">{b.label}</span>
            <div className="h-3 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-purple-500/60" style={{ width: `${p}%` }} />
            </div>
            <span className="text-right tabular-nums text-white/55">{fmt(b.count)}</span>
          </button>
        )
      })}
    </div>
  )
}


function BarBucketSection({ title, subtitle, buckets, onClick }) {
  return (
    <section>
      <SectionHeader title={title} subtitle={subtitle} />
      <BarBucketBody buckets={buckets} onClick={onClick} />
    </section>
  )
}


function InsightCard({ kind, data }) {
  // One generic card body, four flavours. The label changes; the layout
  // and font sizing stay identical so the row reads uniformly even when
  // the modal swaps "Day" for "Camera" between aspects.
  const LABEL = {
    person:  'Person',
    group:   'Group',
    city:    'Location',
    weekday: 'Day',
    camera:  'Camera',
  }[kind]

  let primary, secondary
  if (kind === 'person') {
    primary = data.name
    secondary = data.count
  } else if (kind === 'group') {
    primary = data.names.join(', ')
    secondary = data.count
  } else if (kind === 'city') {
    primary = (
      <>{data.city}{data.state && <span className="text-white/55">, {data.state}</span>}</>
    )
    secondary = data.count
  } else if (kind === 'weekday') {
    primary = data.weekday
    secondary = data.count
  } else if (kind === 'camera') {
    primary = data.model || data.make || '—'
    secondary = data.count
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded border border-white/8 bg-white/3 p-3 text-center">
      <div className="text-[12px] uppercase tracking-wider text-white/45">{LABEL}</div>
      {kind === 'person' && data.avatar && (
        <img
          src={mediaUrl(data.avatar)}
          alt=""
          className="h-12 w-12 flex-none rounded-full object-cover ring-1 ring-white/15 sm:h-14 sm:w-14"
        />
      )}
      <div className="min-w-0 w-full">
        <div className={`break-words font-semibold leading-tight text-white ${kind === 'person' ? 'text-[12px] sm:text-[13px]' : 'text-[13px] sm:text-[15px]'}`}>
          {primary}
        </div>
        <div className="hidden text-[11px] text-white/40 tabular-nums sm:block">{fmt(secondary)} photos</div>
      </div>
    </div>
  )
}


function InsightsModal({
  open, title, badge, hero, count, percent,
  insightsUrl, samplesUrl, hideCards = [],
  onClose,
}) {
  const [samples, setSamples] = useState(null)
  const [insights, setInsights] = useState(null)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setSamples(null)
    setInsights(null)
    setError(null)
    Promise.all([
      fetch(samplesUrl).then(r => (r.ok ? r.json() : Promise.reject(r.status))),
      fetch(insightsUrl).then(r => (r.ok ? r.json() : Promise.reject(r.status))),
    ])
      .then(([s, o]) => {
        if (cancelled) return
        setSamples(s.samples || [])
        setInsights(o)
      })
      .catch(e => { if (!cancelled) setError(String(e)) })
    return () => { cancelled = true }
  }, [open, insightsUrl, samplesUrl])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!open) return null

  const showCard = name => !hideCards.includes(name)
  // Bias toward the 3 most-relevant cards: skip whichever is the aspect
  // we're already filtering by (e.g. hide "Day" when listing per-weekday
  // buckets) and fall back to camera if we'd otherwise drop below 3.
  const candidates = [
    showCard('group')   && insights?.top_group   ? { key: 'group',   data: insights.top_group   } : null,
    showCard('person')  && insights?.top_person  ? { key: 'person',  data: insights.top_person  } : null,
    showCard('city')    && insights?.top_city    ? { key: 'city',    data: insights.top_city    } : null,
    showCard('weekday') && insights?.top_weekday ? { key: 'weekday', data: insights.top_weekday } : null,
    showCard('camera')  && insights?.top_camera  ? { key: 'camera',  data: insights.top_camera  } : null,
  ].filter(Boolean).slice(0, 3)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-xl border border-white/10 bg-stone-950 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-3">
          <div className="flex items-center gap-3">
            {hero}
            <h2 className="text-base font-semibold capitalize text-white">{title}</h2>
            {badge && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/45">
                {badge}
              </span>
            )}
            <span className="text-[12px] tabular-nums text-white/45">
              {fmt(count)} <span className="text-white/30">·</span> {percent.toFixed(1)}%
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="max-h-[calc(90vh-3.5rem)] overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {error && <p className="text-[13px] text-red-400">Failed: {error}</p>}
          {!samples && !error && <p className="text-[13px] text-white/30">Loading…</p>}

          {candidates.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">Most common</h3>
              <div className="grid grid-cols-3 gap-2">
                {candidates.map(c => (
                  <InsightCard key={c.key} kind={c.key} data={c.data} />
                ))}
              </div>
            </div>
          )}

          {insights && insights.objects && insights.objects.length > 0 && (
            <div className="mb-4 rounded border border-white/8 bg-white/3 p-3">
              <div className="mb-2 flex items-baseline gap-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  Top objects detected
                </h3>
                <span className="text-[10px] text-white/30">{fmt(insights.total)} photos in bucket</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {insights.objects.map(o => (
                  <span
                    key={o.object}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70"
                    title={`${o.count.toLocaleString()} of ${insights.total.toLocaleString()}`}
                  >
                    <span className="capitalize">{o.object}</span>
                    <span className="text-white/35 tabular-nums">{(o.share * 100).toFixed(0)}%</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {samples && samples.length === 0 && <p className="text-[13px] text-white/30">No samples.</p>}
          {samples && samples.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {samples.map((s, i) => (
                <div key={`${s.path}-${i}`} className="group relative aspect-square overflow-hidden rounded border border-white/8 bg-white/3">
                  {s.thumb_url && (
                    <img
                      src={s.thumb_url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  )}
                  <span
                    className="absolute bottom-1 right-1 h-3 w-3 rounded ring-1 ring-black/60"
                    style={{ background: s.color || '#6b7280' }}
                    title={s.color}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function FilesystemPage() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [openHue, setOpenHue] = useState(null)
  const [openWeekday, setOpenWeekday] = useState(null)
  const [openHour, setOpenHour] = useState(null)
  const [openCamera, setOpenCamera] = useState(null)
  const [openLocation, setOpenLocation] = useState(null)
  const [openDecade, setOpenDecade] = useState(null)
  const [openDay, setOpenDay] = useState(null)
  const [openPpp, setOpenPpp] = useState(null)
  const [openState, setOpenState] = useState(null)
  const [showAllStates, setShowAllStates] = useState(false)
  const [stateBuckets, setStateBuckets] = useState(null)
  const [showTimestampSource, setShowTimestampSource] = useState(false)
  const [showAllCameras, setShowAllCameras] = useState(false)
  const [openMonth, setOpenMonth] = useState(null)
  const [monthBuckets, setMonthBuckets] = useState(null)
  const [openPerson, setOpenPerson] = useState(null)
  const [peopleBuckets, setPeopleBuckets] = useState(null)
  const [faceClusters, setFaceClusters] = useState(null)
  const [scenes, setScenes] = useState(null)
  const [showAllPeople, setShowAllPeople] = useState(false)
  const [showAllColors, setShowAllColors] = useState(false)
  const [weekdayBuckets, setWeekdayBuckets] = useState(null)
  const [hourBuckets, setHourBuckets] = useState(null)
  const [cameraBuckets, setCameraBuckets] = useState(null)
  const [locationBuckets, setLocationBuckets] = useState(null)
  const [decadeBuckets, setDecadeBuckets] = useState(null)

  useEffect(() => {
    fetch('/api/admin/analytics/weekday/buckets')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setWeekdayBuckets(d.buckets || []))
      .catch(() => {})
    fetch('/api/admin/analytics/hour/buckets')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setHourBuckets(d.buckets || []))
      .catch(() => {})
    fetch('/api/admin/analytics/camera/buckets?limit=10')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setCameraBuckets(d.buckets || []))
      .catch(() => {})
    fetch('/api/admin/analytics/month/buckets')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setMonthBuckets(d.buckets || []))
      .catch(() => {})
    fetch('/api/admin/analytics/people/buckets?limit=10')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setPeopleBuckets(d.buckets || []))
      .catch(() => {})
    fetch('/api/admin/analytics/face_clusters/summary')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setFaceClusters(d))
      .catch(() => {})
    fetch('/api/admin/analytics/scenes/summary')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setScenes(d))
      .catch(() => {})
    fetch('/api/admin/analytics/location/buckets?limit=15')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setLocationBuckets(d.buckets || []))
      .catch(() => {})
    fetch('/api/admin/analytics/decade/buckets?limit=3')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setDecadeBuckets(d.buckets || []))
      .catch(() => {})
    fetch('/api/admin/analytics/state/buckets?limit=15')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setStateBuckets(d.buckets || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/admin/archive-overview')
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Container className="py-6"><p className="text-[13px] text-white/30">Loading…</p></Container>
  if (error)   return <Container className="py-6"><p className="text-[13px] text-red-400">Failed: {error}</p></Container>

  const co = data.colors
  const domTotal     = co.dominant_by_hue.reduce((a, r) => a + r.count, 0)
  const meanTotal    = (co.mean_by_hue || []).reduce((a, r) => a + r.count, 0)
  const salientTotal = (co.salient_by_hue || []).reduce((a, r) => a + r.count, 0)
  const brightTotal  = co.dominant_by_brightness.reduce((a, r) => a + r.count, 0)

  return (
    <Container className="space-y-6 py-6">
      <div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-semibold text-white md:text-2xl">Filesystem</h1>
          <span className="rounded-full border border-purple-500/40 bg-purple-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-purple-300">
            neo4j
          </span>
          <span className="text-[10px] italic text-white/35">{relTime(data.generated)}</span>
        </div>
        <p className="mt-4 flex flex-wrap items-center gap-1.5 text-[12px] text-white/40">
          <span>every</span><Var>Media</Var><span>node with a usable</span><Var>dominant_color</Var>
          <span>property</span>
        </p>
      </div>

      <StatSection title="Overview" cols="six">
        <StatTile label="Media"      value={fmt(data.media.total)}        sub={`${(data.media.total_bytes / 1e9).toFixed(0)} GB`} />
        <StatTile label="People"     value={fmt(data.people.total)}       sub={`${data.people.with_avatar} w/ avatar`} />
        <StatTile label="Appears In" value={fmt(data.edges.appears_in)}   sub="person ↔ media" />
        <StatTile label="GPS"        value={fmt(data.places.with_gps)}    sub={`${data.places.distinct_cities} cities`} />
        <StatTile label="Cameras"    value={fmt(data.trivia.distinct_cameras)} sub={`${data.trivia.avg_megapixels.toFixed(1)} MP avg`} />
        <StatTile label="Streak"     value={fmt(data.trivia.longest_daily_streak)} sub="longest daily" />
      </StatSection>

      <StatSection title="By media type">
        {data.media.by_type.slice(0, 6).map(t => (
          <StatTile
            key={t.labels.join('-')}
            label={t.labels.filter(l => l !== 'Media').slice(0, 1).join(' ') || 'Media'}
            value={fmt(t.count)}
          />
        ))}
      </StatSection>

      <StatSection title="Heritage" subtitle="scanned / documented" cols="four">
        <StatTile label="Heritage media"  value={fmt(data.heritage.total)} />
        <StatTile label="With date"       value={fmt(data.heritage.with_content_date)} />
        <StatTile label="With description"value={fmt(data.heritage.with_description)} />
        <StatTile label="Transcribed"     value={fmt(data.heritage.with_transcription)} />
      </StatSection>

      {(data.heritage.by_physical_status || []).length > 0 && (
        <StatSection title="Heritage physical status" subtitle="where the original lives" cols="three">
          {data.heritage.by_physical_status.map(b => (
            <StatTile key={b.status} label={b.status.replace(/_/g, ' ').toLowerCase()} value={fmt(b.count)} />
          ))}
        </StatSection>
      )}

      <StatSection title="Engagement" subtitle="user-driven artifacts" cols="six">
        <StatTile label="Albums"       value={fmt(data.engagement.albums)} />
        <StatTile label="Collections"  value={fmt(data.engagement.collections)} />
        <StatTile label="Groups"       value={fmt(data.engagement.groups)} />
        <StatTile label="Favorites"    value={fmt(data.engagement.favorites)} />
        <StatTile label="Manual dates" value={fmt(data.engagement.manual_redates)} />
        <StatTile label="Open sugg."   value={fmt(data.engagement.suggestions_open)} />
      </StatSection>

      <ExpandableSection
        title="Top people"
        collapsedSubtitle="most-photographed · tap for breakdown"
        expandedSubtitle="top 10 most-photographed"
        expanded={showAllPeople}
        onToggle={() => setShowAllPeople(v => !v)}
        collapsed={<PeopleLeaderboardBody buckets={peopleBuckets} onClick={setOpenPerson} limit={5} />}
        expandedContent={<PeopleLeaderboardBody buckets={peopleBuckets} onClick={setOpenPerson} limit={10} />}
      />

      {faceClusters?.available && (
        <StatSection title="Face clusters" subtitle="DBSCAN-grouped faces" cols="four">
          <StatTile label="Clusters" value={fmt(faceClusters.total_clusters)} />
          <StatTile label="Faces"    value={fmt(faceClusters.total_faces)} />
          <StatTile label="Assigned" value={fmt(faceClusters.assigned_faces)} sub="linked to a person" />
          <StatTile label="Unassigned" value={fmt(faceClusters.unassigned_faces)} sub="awaiting confirm" />
        </StatSection>
      )}

      {scenes?.available && (
        <>
          <StatSection title="Scene embeddings" subtitle="DINOv2 — powers place/structure similarity" cols="four">
            <StatTile label="Embedded" value={fmt(scenes.total)} sub={scenes.pct != null ? `${scenes.pct}% of eligible` : undefined} />
            <StatTile label="Images"   value={fmt(scenes.images)} />
            <StatTile label="Videos"   value={fmt(scenes.videos)} />
            <StatTile label="Missing"  value={fmt(scenes.missing)} sub="no .scenes.json" />
          </StatSection>
          {scenes.models?.length > 1 && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/8 px-3 py-2.5 text-[12px] text-yellow-300">
              Mixed DINOv2 models — {scenes.models.map(m => `${m.name} (${fmt(m.count)})`).join(', ')}.
              Embeddings from different variants have different dimensions and cannot be compared.
            </div>
          )}
        </>
      )}

      <StatSection title="People graph" cols="six">
        <StatTile label="People"      value={fmt(data.people.total)} />
        <StatTile label="With gallery"value={fmt(data.people.with_gallery)} />
        <StatTile label="With GEDCOM" value={fmt(data.people.with_gedcom_id)} />
        <StatTile label="Deceased"    value={fmt(data.people.deceased)} />
        <StatTile label="Married"     value={fmt(data.edges.married_to)} />
        <StatTile label="Parent of"   value={fmt(data.edges.parent_of)} />
      </StatSection>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
              {showAllColors ? 'Dominant color' : 'Color'}
            </h2>
            <span className="text-[11px] text-white/30">
              {showAllColors ? 'most-frequent single pixel per image' : 'tap a tile for details'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowAllColors(v => !v)}
            className="text-[10px] uppercase tracking-wider text-white/50 underline decoration-white/15 underline-offset-2 hover:text-white"
          >
            {showAllColors ? 'LESS' : 'MORE'}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {(showAllColors ? co.dominant_by_hue : co.dominant_by_hue.slice(0, 5)).map((r, i) => (
            <div key={r.hue} className={!showAllColors && i >= 3 ? 'hidden sm:block' : ''}>
              <HuePill
                hue={r.hue}
                count={r.count}
                total={domTotal}
                samples={r.samples}
                onClick={() => setOpenHue({ ...r, source: 'dominant', total: domTotal })}
              />
            </div>
          ))}
        </div>
      </section>

      {showAllColors && (
        <section>
          <div className="mb-3 flex items-baseline gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Mean color</h2>
            <span className="text-[11px] text-white/30">average of every pixel per image</span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {(co.mean_by_hue || []).map(r => (
              <HuePill
                key={r.hue}
                hue={r.hue}
                count={r.count}
                total={meanTotal}
                samples={r.samples}
                onClick={() => setOpenHue({ ...r, source: 'mean', total: meanTotal })}
              />
            ))}
          </div>
        </section>
      )}

      {showAllColors && (
        <section>
          <div className="mb-3 flex items-baseline gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Salient color</h2>
            <span className="text-[11px] text-white/30">visually striking region per image</span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {(co.salient_by_hue || []).map(r => (
              <HuePill
                key={r.hue}
                hue={r.hue}
                count={r.count}
                total={salientTotal}
                samples={r.samples}
                onClick={() => setOpenHue({ ...r, source: 'salient', total: salientTotal })}
              />
            ))}
          </div>
        </section>
      )}

      {showAllColors && (
      <section>
        <div className="mb-3 flex items-baseline gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Brightness</h2>
          <span className="text-[11px] text-white/30">dominant pixel band</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {co.dominant_by_brightness.map(r => {
            const p = brightTotal ? (r.count / brightTotal) * 100 : 0
            return (
              <div key={r.band} className="rounded-lg border border-white/8 bg-white/3 p-2 pb-1.5 sm:p-3">
                <div className="grid grid-cols-2 items-center gap-2 sm:gap-3">
                  <span className="block aspect-square rounded ring-1 ring-white/15" style={{ background: BRIGHTNESS_COLOR[r.band] }} />
                  <div className="min-w-0 text-right">
                    <div className="text-sm font-bold leading-none tabular-nums text-white/85 sm:text-xl">
                      {p.toFixed(1)}<span className="ml-0.5 text-[10px] text-white/40 sm:text-sm">%</span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-white/35 tabular-nums sm:text-[11px]">{fmt(r.count)}</div>
                  </div>
                </div>
                <div className="mt-2 text-center text-[10px] capitalize text-white/35">{r.band}</div>
              </div>
            )
          })}
        </div>
      </section>
      )}

      <BarBucketSection
        title="By weekday"
        subtitle="when the shutter clicked"
        buckets={weekdayBuckets}
        onClick={b => setOpenWeekday(b)}
      />

      <BarBucketSection
        title="By hour of day"
        subtitle="when the shutter clicked"
        buckets={hourBuckets}
        onClick={b => setOpenHour(b)}
      />

      <BarBucketSection
        title="By month"
        subtitle="when the shutter clicked"
        buckets={monthBuckets}
        onClick={b => setOpenMonth(b)}
      />

      <ExpandableSection
        title="By camera"
        collapsedSubtitle="top 3 by photo count"
        expandedSubtitle={`all ${cameraBuckets?.length ?? ''} cameras · sorted by count`}
        expanded={showAllCameras}
        onToggle={() => setShowAllCameras(v => !v)}
        collapsed={<TopCardGridBody buckets={cameraBuckets} onClick={setOpenCamera} />}
        expandedContent={<BarBucketBody buckets={cameraBuckets} onClick={setOpenCamera} />}
      />

      <ExpandableSection
        title="By location"
        collapsedSubtitle="top 3 cities"
        expandedSubtitle={`all ${stateBuckets?.length ?? ''} states · sorted by count`}
        expanded={showAllStates}
        onToggle={() => setShowAllStates(v => !v)}
        collapsed={<TopCardGridBody buckets={locationBuckets} onClick={setOpenLocation} />}
        expandedContent={<BarBucketBody buckets={stateBuckets} onClick={setOpenState} />}
      />

      <TopCardGrid
        title="By decade"
        subtitle="top 3 by photo count"
        buckets={decadeBuckets}
        onClick={setOpenDecade}
      />

      <StatSection title="People per photo" subtitle="how many faces in frame · tap a bucket" cols="six">
        {data.trivia.people_per_photo.map(b => (
          <StatTile
            key={b.bucket}
            label={b.bucket === '0' ? 'No people' : `${b.bucket} ${b.bucket === '1' ? 'person' : 'people'}`}
            value={fmt(b.count)}
            onClick={() => setOpenPpp(b)}
          />
        ))}
      </StatSection>

      <ExpandableSection
        title="Timestamp confidence"
        collapsedSubtitle="how sure we are of the date"
        expandedSubtitle="how sure we are · where it came from"
        expanded={showTimestampSource}
        onToggle={() => setShowTimestampSource(v => !v)}
        collapsed={
          <div className="grid grid-cols-3 gap-2">
            {data.timestamps.by_confidence.map(b => (
              <StatTile key={b.confidence} label={b.confidence} value={fmt(b.count)} />
            ))}
          </div>
        }
        expandedContent={
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {data.timestamps.by_confidence.map(b => (
                <StatTile key={b.confidence} label={b.confidence} value={fmt(b.count)} />
              ))}
            </div>
            <div>
              <div className="mb-2 text-[10px] uppercase tracking-wider text-white/35">Source · where the date came from</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {data.timestamps.by_source.map(b => (
                  <StatTile key={b.source} label={b.source} value={fmt(b.count)} />
                ))}
              </div>
            </div>
          </div>
        }
      />

      <StatSection title="Busiest single days" subtitle="top 5 — highest photo-per-day · tap to drill in" cols="six">
        {data.trivia.busiest_days.map(b => {
          const dt = new Date(b.day + 'T00:00:00')
          const label = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
          return (
            <StatTile
              key={b.day}
              label={label}
              value={fmt(b.count)}
              onClick={() => setOpenDay(b)}
            />
          )
        })}
      </StatSection>

      <InsightsModal
        open={!!openHue}
        title={openHue?.hue || ''}
        badge={openHue?.source || 'dominant'}
        hero={openHue && (
          <span
            className="inline-block h-5 w-5 rounded ring-1 ring-white/20"
            style={{ background: HUE_COLOR[openHue.hue] || HUE_COLOR.mixed }}
          />
        )}
        count={openHue?.count || 0}
        percent={openHue?.total ? (openHue.count / openHue.total) * 100 : 0}
        insightsUrl={openHue ? `/api/admin/archive-overview/hue/${encodeURIComponent(openHue.hue)}/objects?limit=5&source=${encodeURIComponent(openHue.source || 'dominant')}` : ''}
        samplesUrl={openHue ? `/api/admin/archive-overview/hue/${encodeURIComponent(openHue.hue)}/samples?limit=48&source=${encodeURIComponent(openHue.source || 'dominant')}` : ''}
        onClose={() => setOpenHue(null)}
      />

      <InsightsModal
        open={!!openWeekday}
        title={openWeekday?.label || ''}
        count={openWeekday?.count || 0}
        percent={openWeekday && weekdayBuckets ? (openWeekday.count / weekdayBuckets.reduce((a, b) => a + b.count, 0)) * 100 : 0}
        insightsUrl={openWeekday ? `/api/admin/analytics/weekday/${openWeekday.key}/insights?limit=5` : ''}
        samplesUrl={openWeekday ? `/api/admin/analytics/weekday/${openWeekday.key}/samples?limit=48` : ''}
        hideCards={['weekday']}
        onClose={() => setOpenWeekday(null)}
      />

      <InsightsModal
        open={!!openPerson}
        title={openPerson?.label || ''}
        count={openPerson?.count || 0}
        percent={openPerson && data.media.total ? (openPerson.count / data.media.total) * 100 : 0}
        hero={openPerson?.avatar && (
          <img
            src={mediaUrl(openPerson.avatar)}
            alt=""
            className="h-7 w-7 rounded-full object-cover ring-1 ring-white/20"
          />
        )}
        insightsUrl={openPerson ? `/api/admin/analytics/people/${encodeURIComponent(openPerson.key)}/insights?limit=5` : ''}
        samplesUrl={openPerson ? `/api/admin/analytics/people/${encodeURIComponent(openPerson.key)}/samples?limit=48` : ''}
        hideCards={['person']}
        onClose={() => setOpenPerson(null)}
      />

      <InsightsModal
        open={!!openMonth}
        title={openMonth?.label || ''}
        count={openMonth?.count || 0}
        percent={openMonth && monthBuckets ? (openMonth.count / monthBuckets.reduce((a, b) => a + b.count, 0)) * 100 : 0}
        insightsUrl={openMonth ? `/api/admin/analytics/month/${openMonth.key}/insights?limit=5` : ''}
        samplesUrl={openMonth ? `/api/admin/analytics/month/${openMonth.key}/samples?limit=48` : ''}
        onClose={() => setOpenMonth(null)}
      />

      <InsightsModal
        open={!!openHour}
        title={openHour?.label || ''}
        count={openHour?.count || 0}
        percent={openHour && hourBuckets ? (openHour.count / hourBuckets.reduce((a, b) => a + b.count, 0)) * 100 : 0}
        insightsUrl={openHour ? `/api/admin/analytics/hour/${openHour.key}/insights?limit=5` : ''}
        samplesUrl={openHour ? `/api/admin/analytics/hour/${openHour.key}/samples?limit=48` : ''}
        hideCards={['weekday']}
        onClose={() => setOpenHour(null)}
      />

      <InsightsModal
        open={!!openCamera}
        title={openCamera?.label || ''}
        count={openCamera?.count || 0}
        percent={openCamera && cameraBuckets ? (openCamera.count / cameraBuckets.reduce((a, b) => a + b.count, 0)) * 100 : 0}
        insightsUrl={openCamera ? `/api/admin/analytics/camera/${encodeURIComponent(openCamera.key)}/insights?limit=5` : ''}
        samplesUrl={openCamera ? `/api/admin/analytics/camera/${encodeURIComponent(openCamera.key)}/samples?limit=48` : ''}
        hideCards={['camera']}
        onClose={() => setOpenCamera(null)}
      />

      <InsightsModal
        open={!!openLocation}
        title={openLocation?.label || ''}
        count={openLocation?.count || 0}
        percent={openLocation && locationBuckets ? (openLocation.count / locationBuckets.reduce((a, b) => a + b.count, 0)) * 100 : 0}
        insightsUrl={openLocation ? `/api/admin/analytics/location/${encodeURIComponent(openLocation.key)}/insights?limit=5` : ''}
        samplesUrl={openLocation ? `/api/admin/analytics/location/${encodeURIComponent(openLocation.key)}/samples?limit=48` : ''}
        hideCards={['city']}
        onClose={() => setOpenLocation(null)}
      />

      <InsightsModal
        open={!!openState}
        title={openState?.label || ''}
        count={openState?.count || 0}
        percent={openState && data.media.total ? (openState.count / data.media.total) * 100 : 0}
        insightsUrl={openState ? `/api/admin/analytics/state/${encodeURIComponent(openState.key)}/insights?limit=5` : ''}
        samplesUrl={openState ? `/api/admin/analytics/state/${encodeURIComponent(openState.key)}/samples?limit=48` : ''}
        onClose={() => setOpenState(null)}
      />

      <InsightsModal
        open={!!openDecade}
        title={openDecade?.label || ''}
        count={openDecade?.count || 0}
        percent={openDecade && decadeBuckets ? (openDecade.count / decadeBuckets.reduce((a, b) => a + b.count, 0)) * 100 : 0}
        insightsUrl={openDecade ? `/api/admin/analytics/decade/${openDecade.key}/insights?limit=5` : ''}
        samplesUrl={openDecade ? `/api/admin/analytics/decade/${openDecade.key}/samples?limit=48` : ''}
        onClose={() => setOpenDecade(null)}
      />

      <InsightsModal
        open={!!openDay}
        title={openDay ? new Date(openDay.day + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) : ''}
        count={openDay?.count || 0}
        percent={openDay ? (openDay.count / data.media.total) * 100 : 0}
        insightsUrl={openDay ? `/api/admin/analytics/day/${openDay.day}/insights?limit=5` : ''}
        samplesUrl={openDay ? `/api/admin/analytics/day/${openDay.day}/samples?limit=48` : ''}
        onClose={() => setOpenDay(null)}
      />

      <InsightsModal
        open={!!openPpp}
        title={openPpp ? (openPpp.bucket === '0' ? 'No people' : `${openPpp.bucket} ${openPpp.bucket === '1' ? 'person' : 'people'}`) : ''}
        count={openPpp?.count || 0}
        percent={openPpp ? (openPpp.count / data.media.total) * 100 : 0}
        insightsUrl={openPpp ? `/api/admin/analytics/people_per_photo/${encodeURIComponent(openPpp.bucket)}/insights?limit=5` : ''}
        samplesUrl={openPpp ? `/api/admin/analytics/people_per_photo/${encodeURIComponent(openPpp.bucket)}/samples?limit=48` : ''}
        onClose={() => setOpenPpp(null)}
      />
    </Container>
  )
}

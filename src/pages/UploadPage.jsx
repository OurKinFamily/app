import { useEffect, useRef, useState } from 'react'
import { UploadCloud, Image as ImageIcon, Film, CheckCircle2, AlertCircle, Copy, X } from 'lucide-react'
import { Container } from '../components/Container'
import { useToast } from '../components/Toast'
import { uploadMedia, getUploadStatus } from '../lib/upload'
import { cn } from '../lib/cn'

const IMAGE_RE = /\.(jpe?g|png|heic|heif|webp|gif|tiff?)$/i
const isVideo = (name) => /\.(mp4|mov|avi|mkv|m4v|mpg|mpeg|webm|3gp)$/i.test(name)

// Where the batch lands. Staging is the safe default — held out of the gallery
// until reviewed; gallery makes them visible right away (needs a confirm).
const DESTINATIONS = [
  { key: 'staging', label: 'Hold for review', hint: 'Kept out of the gallery until you look them over.' },
  { key: 'gallery', label: 'Add to gallery', hint: 'Appears in the gallery straight away.' },
]

function ReadinessBadge({ readiness }) {
  if (!readiness) return null
  const score = readiness.score ?? 0
  const tone =
    score >= 100 ? 'bg-green-100 text-green-800'
    : score >= 60 ? 'bg-amber-100 text-amber-800'
    : 'bg-red-100 text-red-700'
  return <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', tone)}>{score}% ready</span>
}

function StatusIcon({ status }) {
  if (status === 'done') return <CheckCircle2 size={18} className="text-green-600" />
  if (status === 'duplicate') return <Copy size={18} className="text-amber-600" />
  if (status === 'error') return <AlertCircle size={18} className="text-red-600" />
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
}

export function UploadPage() {
  const { toast } = useToast()
  const inputRef = useRef(null)
  const [picked, setPicked] = useState([])       // { file, url } chosen but not yet sent
  const [destination, setDestination] = useState('staging')
  const [confirmGallery, setConfirmGallery] = useState(false)
  const [job, setJob] = useState(null)           // server job being polled
  const [busy, setBusy] = useState(false)

  // Revoke object URLs on unmount / replace so we don't leak blobs.
  useEffect(() => () => picked.forEach(p => URL.revokeObjectURL(p.url)), [picked])

  // Poll the job until every file finishes.
  useEffect(() => {
    if (!job || job.status === 'done') return
    let alive = true
    const t = setInterval(async () => {
      try {
        const next = await getUploadStatus(job.id)
        if (!alive) return
        setJob(next)
        if (next.status === 'done') clearInterval(t)
      } catch { /* keep polling; transient */ }
    }, 1500)
    return () => { alive = false; clearInterval(t) }
  }, [job])

  function addFiles(fileList) {
    const incoming = Array.from(fileList)
      .filter(f => IMAGE_RE.test(f.name) || isVideo(f.name))
      .map(f => ({ file: f, url: URL.createObjectURL(f) }))
    setPicked(prev => [...prev, ...incoming])
  }

  function removePicked(idx) {
    setPicked(prev => {
      URL.revokeObjectURL(prev[idx].url)
      return prev.filter((_, i) => i !== idx)
    })
  }

  async function startUpload() {
    if (!picked.length) return
    setBusy(true)
    try {
      const created = await uploadMedia(picked.map(p => p.file), destination)
      setJob(created)
      picked.forEach(p => URL.revokeObjectURL(p.url))
      setPicked([])
      setConfirmGallery(false)
      toast.success(`Uploading ${created.files.length} file${created.files.length === 1 ? '' : 's'}…`)
    } catch (e) {
      toast.error(e.message || 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  const needsConfirm = destination === 'gallery' && !confirmGallery
  const canUpload = picked.length > 0 && !busy && !needsConfirm

  const done = job?.status === 'done'
  const summary = job && {
    done:      job.files.filter(f => f.status === 'done').length,
    duplicate: job.files.filter(f => f.status === 'duplicate').length,
    error:     job.files.filter(f => f.status === 'error').length,
  }

  return (
    <Container className="py-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Upload photos &amp; videos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Add photos or videos from this device. You can pick several at once.
        </p>
      </div>

      {/* Drop / pick area */}
      <label
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center transition-colors hover:border-gray-400 hover:bg-gray-100"
      >
        <UploadCloud size={32} className="text-gray-400" />
        <span className="text-sm font-medium text-gray-700">Tap to choose, or drop files here</span>
        <span className="text-xs text-gray-400">Photos and videos</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={e => { addFiles(e.target.files); e.target.value = '' }}
        />
      </label>

      {/* Picked, not yet uploaded */}
      {picked.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">{picked.length} selected</p>
            <button onClick={() => setPicked([])} className="text-xs text-gray-500 hover:text-gray-800">Clear all</button>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {picked.map((p, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                {isVideo(p.file.name)
                  ? <div className="flex h-full items-center justify-center"><Film size={20} className="text-gray-400" /></div>
                  : <img src={p.url} alt="" className="h-full w-full object-cover" />}
                <button
                  onClick={() => removePicked(i)}
                  className="absolute right-1 top-1 rounded-full bg-black/50 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Remove"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* Destination */}
          <div className="mt-5 space-y-2">
            {DESTINATIONS.map(d => (
              <label key={d.key} className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                destination === d.key ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300',
              )}>
                <input
                  type="radio" name="destination" value={d.key}
                  checked={destination === d.key}
                  onChange={() => { setDestination(d.key); setConfirmGallery(false) }}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-900">{d.label}</span>
                  <span className="block text-xs text-gray-500">{d.hint}</span>
                </span>
              </label>
            ))}
          </div>

          {destination === 'gallery' && (
            <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={confirmGallery} onChange={e => setConfirmGallery(e.target.checked)} />
              Yes, add these to the gallery now.
            </label>
          )}

          <button
            onClick={startUpload}
            disabled={!canUpload}
            className="mt-4 w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Uploading…' : `Upload ${picked.length} file${picked.length === 1 ? '' : 's'}`}
          </button>
        </div>
      )}

      {/* In-flight / finished job */}
      {job && (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              {done ? 'Upload complete' : 'Processing…'}
            </p>
            {done && summary && (
              <p className="text-xs text-gray-500">
                {summary.done} added
                {summary.duplicate ? ` · ${summary.duplicate} duplicate` : ''}
                {summary.error ? ` · ${summary.error} failed` : ''}
              </p>
            )}
          </div>
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
            {job.files.map((f, i) => (
              <li key={i} className="flex items-center gap-3 px-3 py-2.5">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-gray-100">
                  {f.thumbnail_url
                    ? <img src={f.thumbnail_url} alt="" className="h-full w-full object-cover" />
                    : <div className="flex h-full items-center justify-center">
                        {f.is_video ? <Film size={16} className="text-gray-400" /> : <ImageIcon size={16} className="text-gray-400" />}
                      </div>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-800">{f.filename}</p>
                  <p className="text-xs text-gray-400">
                    {f.status === 'duplicate' ? 'Already in the archive'
                      : f.status === 'error' ? (f.error || 'Failed')
                      : f.status === 'done' ? (f.timestamp ? f.timestamp.slice(0, 10) : 'No date found')
                      : f.status}
                  </p>
                </div>
                <ReadinessBadge readiness={f.readiness} />
                <StatusIcon status={f.status} />
              </li>
            ))}
          </ul>
          {done && (
            <button
              onClick={() => setJob(null)}
              className="mt-4 text-sm text-gray-500 hover:text-gray-800"
            >
              Upload more
            </button>
          )}
        </div>
      )}
    </Container>
  )
}

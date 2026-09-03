import { useCallback, useEffect, useState } from 'react'
import { getUploadStatus, uploadMedia } from '../../lib/upload'
import { useToast } from '../../components/Toast'

/**
 * Getting photographs off a device and into the archive.
 *
 * Two places they can land. Staging holds them out of the gallery until
 * somebody has looked — dates get read wrong, screenshots get picked up by
 * accident, and an archive that anyone in the family browses should not fill
 * with those. Adding straight to the gallery is offered, and asks twice.
 */
const IMAGE = /\.(jpe?g|png|heic|heif|webp|gif|tiff?)$/i
const VIDEO = /\.(mp4|mov|avi|mkv|m4v|mpg|mpeg|webm|3gp)$/i

export const isVideoName = name => VIDEO.test(name)

export const DESTINATIONS = [
  {
    key: 'staging',
    label: 'Hold them for review',
    hint: 'Kept out of the gallery until you have looked at them.',
  },
  {
    key: 'gallery',
    label: 'Straight into the gallery',
    hint: 'Everybody sees them right away.',
  },
]

export function useUpload() {
  const { toast } = useToast()
  const [picked, setPicked] = useState([])
  const [destination, setDestination] = useState('staging')
  const [confirmed, setConfirmed] = useState(false)
  const [job, setJob] = useState(null)
  const [busy, setBusy] = useState(false)

  // Previews are object URLs; the browser holds the whole file behind each one
  // until it is revoked, and a batch of four hundred photographs is gigabytes.
  useEffect(() => () => picked.forEach(p => URL.revokeObjectURL(p.url)), [picked])

  useEffect(() => {
    if (!job || job.status === 'done') return
    let alive = true
    const timer = setInterval(async () => {
      try {
        const next = await getUploadStatus(job.id)
        if (alive) setJob(next)
      } catch {
        // Keep asking. A dropped poll mid-import is not worth an error, and
        // the next one in a second and a half usually answers.
      }
    }, 1500)
    return () => { alive = false; clearInterval(timer) }
  }, [job])

  const add = useCallback(files => {
    const accepted = Array.from(files)
      .filter(f => IMAGE.test(f.name) || VIDEO.test(f.name))
      .map(f => ({ file: f, url: URL.createObjectURL(f) }))
    setPicked(prev => [...prev, ...accepted])
  }, [])

  const drop = useCallback(index => setPicked(prev => {
    URL.revokeObjectURL(prev[index].url)
    return prev.filter((_, i) => i !== index)
  }), [])

  const clear = useCallback(() => setPicked(prev => {
    prev.forEach(p => URL.revokeObjectURL(p.url))
    return []
  }), [])

  const send = useCallback(async () => {
    if (!picked.length) return
    setBusy(true)
    try {
      const started = await uploadMedia(picked.map(p => p.file), destination)
      setJob(started)
      clear()
      setConfirmed(false)
      const n = started.files.length
      toast.success(`${n} ${n === 1 ? 'file' : 'files'} on their way`)
    } catch (e) {
      toast.error(e.message || 'That did not upload')
    } finally {
      setBusy(false)
    }
  }, [picked, destination, clear, toast])

  const needsConfirming = destination === 'gallery' && !confirmed

  return {
    picked, add, drop, clear, send,
    destination,
    setDestination: key => { setDestination(key); setConfirmed(false) },
    confirmed, setConfirmed, needsConfirming,
    job, clearJob: () => setJob(null),
    busy,
    canSend: picked.length > 0 && !busy && !needsConfirming,
    summary: job && {
      added: job.files.filter(f => f.status === 'done').length,
      duplicate: job.files.filter(f => f.status === 'duplicate').length,
      failed: job.files.filter(f => f.status === 'error').length,
    },
  }
}

/** What became of one file, in words rather than a status code. */
export function fileOutcome(file) {
  if (file.status === 'duplicate') return 'Already in the archive'
  if (file.status === 'error') return file.error || 'Did not work'
  if (file.status === 'done') return file.timestamp ? file.timestamp.slice(0, 10) : 'No date on it'
  return 'Working…'
}

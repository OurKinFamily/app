import { useCallback, useEffect, useRef, useState } from 'react'
import { assignCluster, createPerson, getCluster, skipCluster } from '../lib/api'
import { useToast } from '../components/Toast'

/**
 * Naming one group of faces — or the part of it that is actually one person.
 *
 * A group of four hundred faces is often two people who look alike, or one
 * person and a few strangers standing behind them. So the work is: look at
 * what is on screen, cross out what is wrong, and give the rest a name. Only
 * the faces currently shown are assigned; the rest stay behind for the next
 * pass, which is what makes a four-hundred-face group tractable at all.
 *
 * Crossing a face out is not the same as leaving it alone. Excluded faces are
 * sent along as exclusions, so they will not come back the next time the
 * archive is reclustered.
 */
const BATCH = 200

export function useClusterAssign(cluster, { onAssigned, onSkipped }) {
  const clusterId = cluster?.id
  const clusterSize = cluster?.size
  const { toast } = useToast()
  const [detail, setDetail] = useState(null)
  const [batch, setBatch] = useState(BATCH)
  const [shown, setShown] = useState(BATCH)
  const [excluded, setExcluded] = useState(() => new Set())
  const [lastNamed, setLastNamed] = useState(null)
  const [saving, setSaving] = useState(false)
  // The same fact as `saving`, readable straight away. State is only visible
  // to the next render, so two calls in one tick — a double-click, or Enter
  // held down — both saw false and both went through, telling the queue that
  // twenty faces were taken out of a group of ten.
  const inFlight = useRef(false)

  useEffect(() => {
    if (!clusterId) return
    let alive = true
    getCluster(clusterId)
      .then(d => { if (alive) setDetail(d) })
      .catch(() => {})
    return () => { alive = false }
  }, [clusterId])

  const toggle = useCallback(faceIndex => setExcluded(prev => {
    const next = new Set(prev)
    if (next.has(faceIndex)) next.delete(faceIndex)
    else next.add(faceIndex)
    return next
  }), [])

  /** What is on screen, split into "this is them" and "this is not". */
  const currentBatch = useCallback(() => {
    const visible = (detail?.faces || []).slice(0, shown)
    return {
      include: visible.filter(f => !excluded.has(f.face_index)).map(f => [f.photo_path, f.face_index]),
      exclude: visible.filter(f => excluded.has(f.face_index)).map(f => [f.photo_path, f.face_index]),
      // Keyed by photo AND index — a face_index on its own repeats across
      // photographs, and de-duplicating on it alone dropped faces silently.
      handled: new Set(visible.map(f => `${f.photo_path}|${f.face_index}`)),
    }
  }, [detail, shown, excluded])

  const assign = useCallback(async (personId, personName) => {
    if (inFlight.current || !clusterId) return
    inFlight.current = true
    setSaving(true)
    try {
      const args = currentBatch()
      await assignCluster(clusterId, personId, args)
      const taken = args.handled.size
      setDetail(d => (d ? {
        ...d,
        // Guarded the same way the read is. A group that comes back with no
        // faces at all — emptied between the queue loading and being opened —
        // otherwise threw here on the way to saving nothing.
        faces: (d.faces || []).filter(f => !args.handled.has(`${f.photo_path}|${f.face_index}`)),
        size: Math.max(0, (d.size || 0) - taken),
      } : d))
      setExcluded(new Set())
      setShown(batch)
      setLastNamed({ id: personId, name: personName })
      onAssigned(clusterId, taken)
      toast.success(`${taken.toLocaleString()} ${taken === 1 ? 'face' : 'faces'} now ${personName}`)
    } catch (e) {
      toast.error(e.message || 'That did not save')
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }, [clusterId, currentBatch, batch, onAssigned, toast])

  const createAndAssign = useCallback(async name => {
    const trimmed = name.trim()
    if (!trimmed || inFlight.current) return
    try {
      const person = await createPerson({ name: trimmed })
      await assign(person.id, trimmed)
    } catch (e) {
      toast.error(e.message || 'Could not add them')
    }
  }, [assign, toast])

  const skip = useCallback(async () => {
    if (!clusterId) return
    await skipCluster(clusterId)
    onSkipped(clusterId)
  }, [clusterId, onSkipped])

  const faces = detail?.faces || []
  const size = detail?.size ?? clusterSize ?? 0

  return {
    detail, faces, size,
    visible: faces.slice(0, shown),
    remaining: Math.max(0, faces.length - shown),
    shown, batch, setBatch,
    showMore: () => setShown(s => s + batch),
    excluded, toggle, clearExcluded: () => setExcluded(new Set()),
    lastNamed, saving,
    assign, createAndAssign, skip,
  }
}

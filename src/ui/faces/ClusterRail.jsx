import { useEffect, useRef } from 'react'
import { C } from '../tokens'

/**
 * The queue down the left: every group of faces still waiting for a name.
 *
 * One sample face and a count. That is enough to choose from — you are looking
 * for a face you recognise, and a hundred of them on screen at once beats
 * twenty with names you would have to read.
 */
export function ClusterRail({ clusters, selected, onSelect, loading, loadingMore, hasMore, onMore }) {
  const sentinel = useRef(null)

  useEffect(() => {
    const el = sentinel.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) onMore()
    }, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, onMore])

  return (
    <aside style={{
      width: 96, flex: '0 0 auto', overflowY: 'auto',
      borderRight: `1px solid ${C.border}`, padding: 8,
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      {loading && <p style={hint}>Loading…</p>}
      {!loading && clusters.length === 0 && <p style={hint}>Nothing left.</p>}

      {clusters.map(cluster => {
        const on = selected?.id === cluster.id
        return (
          <button
            key={cluster.id}
            type="button"
            onClick={() => onSelect(cluster)}
            style={{
              padding: 5, borderRadius: 10, font: 'inherit', cursor: 'pointer',
              border: `1px solid ${on ? C.activeText : C.border}`,
              background: on ? C.activeBg : C.bg,
              textAlign: 'center',
            }}
          >
            {cluster.samples?.[0] ? (
              <img
                src={cluster.samples[0]}
                alt=""
                loading="lazy"
                onError={e => { e.currentTarget.style.visibility = 'hidden' }}
                style={{
                  width: '100%', aspectRatio: '1', objectFit: 'cover',
                  borderRadius: 7, background: C.hover, display: 'block',
                }}
              />
            ) : (
              <span style={{
                display: 'grid', placeItems: 'center', width: '100%', aspectRatio: '1',
                borderRadius: 7, background: C.hover, color: C.muted, fontSize: 16,
              }}>
                ?
              </span>
            )}
            <span style={{
              display: 'block', marginTop: 4, fontSize: 11,
              color: on ? C.activeText : C.muted, fontVariantNumeric: 'tabular-nums',
            }}>
              {cluster.size.toLocaleString()}
            </span>
          </button>
        )
      })}

      <div ref={sentinel} style={{ padding: '6px 0', textAlign: 'center' }}>
        {loadingMore && <span style={hint}>Loading…</span>}
      </div>
    </aside>
  )
}

const hint = { fontSize: 11.5, color: C.muted, margin: 0 }

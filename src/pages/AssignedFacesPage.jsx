import { useState, useEffect, useCallback } from 'react'
import { getClusters, getCluster } from '../lib/api'

function ClusterCard({ cluster, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border transition-colors p-2 ${
        isSelected
          ? 'border-blue-500/60 bg-blue-500/10'
          : 'border-white/5 bg-white/3 hover:border-white/15 hover:bg-white/5'
      }`}
    >
      <div className="flex gap-1 mb-1.5">
        {cluster.samples.slice(0, 4).map((url, i) => (
          <img
            key={i}
            src={url}
            alt=""
            className="w-12 h-12 rounded object-cover bg-white/5"
            onError={e => { e.target.style.display = 'none' }}
          />
        ))}
      </div>
      <div className="text-[12px] text-white/70 font-medium truncate">{cluster.person_name || cluster.person_id}</div>
      <div className="text-[11px] text-white/30">{cluster.size} face{cluster.size !== 1 ? 's' : ''}</div>
    </button>
  )
}

function DetailPanel({ cluster }) {
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    setDetail(null)
    if (!cluster) return
    getCluster(cluster.id).then(setDetail).catch(() => {})
  }, [cluster?.id])

  if (!cluster) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
        Select a cluster to view
      </div>
    )
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-y-auto">
      <div>
        <h2 className="text-base font-medium text-white">
          {cluster.person_name || cluster.person_id}
        </h2>
        <p className="text-[12px] text-white/30">{cluster.size} faces · cluster #{cluster.id}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(detail?.faces || cluster.samples.map(url => ({ crop_url: url }))).map((f, i) => (
          <img
            key={i}
            src={f.crop_url || f}
            alt=""
            className="w-16 h-16 rounded object-cover bg-white/5"
            onError={e => { e.target.style.display = 'none' }}
          />
        ))}
      </div>
    </div>
  )
}

export function AssignedFacesPage() {
  const [clusters, setClusters] = useState([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    setLoading(true)
    getClusters('assigned', 200, 0)
      .then(data => {
        setClusters(data.clusters)
        setTotal(data.total)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex h-full min-h-screen">
      <div className="w-56 shrink-0 border-r border-white/5 flex flex-col">
        <div className="px-4 pt-6 pb-3 border-b border-white/5">
          <h1 className="text-sm font-semibold text-white">Assigned Clusters</h1>
          <p className="text-[11px] text-white/30 mt-0.5">
            {loading ? '…' : `${total} assigned`}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {loading && <p className="text-white/20 text-xs p-2">Loading…</p>}
          {!loading && clusters.length === 0 && (
            <p className="text-white/20 text-xs p-2">No assigned clusters yet.</p>
          )}
          {clusters.map(c => (
            <ClusterCard
              key={c.id}
              cluster={c}
              isSelected={selected?.id === c.id}
              onClick={() => setSelected(c)}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 p-6 flex overflow-hidden">
        <DetailPanel cluster={selected} />
      </div>
    </div>
  )
}

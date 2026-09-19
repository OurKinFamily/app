import { useCallback, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { GroupCard } from '../ui/faces/GroupCard'
import { CandidateCard } from '../ui/faces/CandidateCard'
import { AmbiguousCard } from '../ui/faces/AmbiguousCard'
import { LeftoverRow } from '../ui/faces/LeftoverRow'
import { LoadingDots } from '../ui/LoadingDots'
import { MediaDetail } from '../ui/MediaDetail'
import { useFaceReview } from '../lib/useFaceReview'
import { isVideo, mediaUrl } from '../lib/media'
import { C } from '../ui/tokens'

/**
 * Working through the faces the archive cannot place on its own.
 *
 * Four sections, ordered by how much the machine already knows — the
 * strongest suggestions first, the shapeless leftovers last — so somebody with
 * ten minutes spends them where the evidence is best.
 *
 * Re-scoring is a twenty-five second pass over the whole archive, so it only
 * happens when asked. Everything dealt with in between simply disappears from
 * the page.
 */

const PAGE = 5

export function FaceSuggestions() {
  const review = useFaceReview()
  const [shown, setShown] = useState({ groups: PAGE, ambiguous: PAGE, candidates: PAGE })
  const [photo, setPhoto] = useState(null)

  const openPhoto = useCallback(path => path && setPhoto(path), [])
  const more = key => setShown(s => ({ ...s, [key]: s[key] + 10 }))

  const { data, hidden, busy } = review
  const groups = (data?.groups || []).filter(g => !hidden.has(g.person_id))
  const ambiguous = (data?.ambiguous || []).filter(a => !hidden.has(a.cluster_id))
  // The endpoint says unknown_candidates; reading `candidates` left that
  // whole section permanently empty.
  const candidates = (data?.unknown_candidates || [])
    .filter(c => !hidden.has(c.candidate_id))
  const leftover = (review.leftover.items || []).filter(c => !hidden.has(c.cluster_id))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 6px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, margin: 0 }}>Face suggestions</h1>
        {review.remaining != null && (
          <span style={{ fontSize: 13, color: C.muted }}>
            {review.remaining.toLocaleString()} faces still unnamed
          </span>
        )}
        <div style={{ flex: 1 }} />

        <Tuner
          label="Confidence"
          value={review.threshold}
          onChange={review.setThreshold}
          // Down to 30%. The low end is where the thin cases live — somebody
          // photographed twice, forty years apart — and the reader is looking
          // at every face anyway, so a bad suggestion costs a glance.
          options={[0.3, 0.4, 0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95]}
          format={v => `${Math.round(v * 100)}%`}
        />
        <Tuner
          label="Smallest group"
          value={review.minClusterSize}
          onChange={review.setMinClusterSize}
          options={[1, 2, 3, 5, 10]}
          format={v => (v === 1 ? 'any' : v)}
        />
        <button type="button" onClick={review.reload} disabled={review.loading} style={pill}>
          <RefreshCw size={14} /> {review.loading ? 'Scoring…' : 'Rescore'}
        </button>
      </div>

      <p style={{ fontSize: 12.5, color: C.muted, margin: '0 0 18px', maxWidth: '76ch' }}>
        Rescoring takes about twenty-five seconds, so it only runs when asked.
        Anything you deal with disappears until the next one.
      </p>

      {review.error && (
        <p style={{ color: '#c5221f', fontSize: 13 }}>{review.error}</p>
      )}

      {review.loading && !data && <LoadingDots />}

      <Section
        title="Looks like somebody you have named"
        count={groups.length}
        empty="Nothing to confirm at this confidence."
      >
        {groups.slice(0, shown.groups).map(group => (
          <GroupCard
            key={group.person_id}
            group={group}
            busy={busy}
            onOpenPhoto={openPhoto}
            onConfirm={review.confirmGroup}
            onDismiss={g => review.hide(g.person_id)}
          />
        ))}
        <More shown={shown.groups} total={groups.length} onMore={() => more('groups')} />
      </Section>

      <Section
        title="Could be either"
        count={ambiguous.length}
        empty="Nothing needs a decision."
      >
        {ambiguous.slice(0, shown.ambiguous).map(entry => (
          <AmbiguousCard
            key={entry.cluster_id}
            entry={entry}
            busy={busy}
            onOpenPhoto={openPhoto}
            onPick={review.pickCandidate}
          />
        ))}
        <More shown={shown.ambiguous} total={ambiguous.length} onMore={() => more('ambiguous')} />
      </Section>

      <Section
        title="Faces that go together, but nobody named"
        count={candidates.length}
        empty="Nobody new to name."
      >
        {candidates.slice(0, shown.candidates).map(candidate => (
          <CandidateCard
            key={candidate.candidate_id}
            candidate={candidate}
            busy={busy}
            onOpenPhoto={openPhoto}
            onCreate={review.nameUnknown}
            onAssign={review.assignUnknown}
            onPark={review.parkUnknown}
            onSkip={review.skipForever}
            onDismiss={c => review.hide(c.candidate_id)}
          />
        ))}
        <More shown={shown.candidates} total={candidates.length} onMore={() => more('candidates')} />
      </Section>

      <Section
        title="Everything else"
        count={review.leftover.total}
        empty="No leftovers."
      >
        {leftover.map(cluster => (
          <LeftoverRow
            key={cluster.cluster_id}
            cluster={cluster}
            busy={busy}
            onOpenPhoto={openPhoto}
            onAssign={review.assignCluster}
            onCreate={review.createForCluster}
            onPark={review.parkCluster}
            onSkip={review.skipCluster}
          />
        ))}
        {review.leftover.loading && <LoadingDots />}
        {leftover.length < review.leftover.total && !review.leftover.loading && (
          <button type="button" onClick={review.moreLeftover} style={moreButton}>
            Show more of {review.leftover.total.toLocaleString()}
          </button>
        )}
      </Section>

      {photo && (
        <MediaDetail
          item={{
            path: photo,
            url: mediaUrl(photo),
            // Faces are pulled from video frames as well as photographs, and
            // a .mov inside an <img> renders nothing at all.
            is_video: isVideo(photo),
            thumbnail_url: isVideo(photo)
              ? mediaUrl(`${photo}.poster.jpg`)
              : mediaUrl(photo),
            filename: photo.split('/').pop(),
          }}
          onClose={() => setPhoto(null)}
        />
      )}
    </div>
  )
}

function Section({ title, count, empty, children }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{
        display: 'flex', alignItems: 'baseline', gap: 8,
        fontSize: 14, fontWeight: 500, margin: '0 0 10px',
      }}>
        {title}
        {count > 0 && (
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>
            {count.toLocaleString()}
          </span>
        )}
      </h2>
      {count > 0 ? children : <p style={{ fontSize: 12.5, color: C.muted, margin: 0 }}>{empty}</p>}
    </section>
  )
}

function More({ shown, total, onMore }) {
  if (shown >= total) return null
  return (
    <button type="button" onClick={onMore} style={moreButton}>
      Show more — {(total - shown).toLocaleString()} left
    </button>
  )
}

function Tuner({ label, value, onChange, options, format }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: C.muted }}>
      {label}
      <select
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          height: 30, padding: '0 8px', borderRadius: 8,
          border: `1px solid ${C.border}`, background: C.bg,
          font: 'inherit', fontSize: 12.5, color: C.text, cursor: 'pointer',
        }}
      >
        {options.map(o => <option key={o} value={o}>{format(o)}</option>)}
      </select>
    </label>
  )
}

const pill = {
  display: 'inline-flex', alignItems: 'center', gap: 7,
  height: 32, padding: '0 14px', borderRadius: 16, fontSize: 12.5,
  border: `1px solid ${C.border}`, background: 'transparent',
  color: C.text, cursor: 'pointer',
}
const moreButton = {
  width: '100%', height: 32, borderRadius: 16, fontSize: 12.5, marginTop: 8,
  border: `1px solid ${C.border}`, background: 'transparent',
  color: C.text, cursor: 'pointer',
}

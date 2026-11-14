/**
 * One person, several frames.
 *
 * Faces are pulled from eight sampled frames of every video, so the same
 * person turns up repeatedly in one file — and legitimately so: each frame is
 * a real detection with its own box and its own crop. The face-box overlay
 * needs all of them. A list of who is in the video does not, and showing them
 * raw produced "Cayce, Cayce" against a single clip, which reads as a bug.
 *
 * Deduplicating at detection time was the obvious alternative and is worse.
 * The video sidecar already tries, at 0.6 similarity, and on a 28-face clip it
 * merged nothing: the same person across frames scores 0.40–0.50, under the
 * threshold. Dropping the threshold far enough to catch them means
 * single-link chaining on raw similarity with no idea who anybody is, which
 * is how one cluster ended up holding 6,890 faces of several different
 * people. Grouping here instead costs nothing and uses what the archive
 * already knows: a name somebody confirmed, or a guess that cleared the
 * margin.
 */

/**
 * Who is in this photograph or video, one row per person.
 *
 * Keeps every face index so hovering still lights up the right boxes and
 * removing somebody removes all of them, not just the first frame they
 * happened to appear in.
 */
export function groupPeopleRows(people) {
  const rows = []
  const at = new Map()
  for (const p of people || []) {
    if (!p) continue
    const key = p.id || p.name
    if (!key) continue
    const seen = at.get(key)
    if (seen == null) {
      at.set(key, rows.length)
      rows.push({ ...p, face_indexes: [p.face_index].filter(i => i != null) })
    } else if (p.face_index != null) {
      rows[seen].face_indexes.push(p.face_index)
    }
  }
  return rows
}

/**
 * The guesses worth asking about, one question per person.
 *
 * Five frames of Guillaume is one question, not five. The best-scoring face
 * is the one shown, because it is the one most likely to be recognisable, and
 * answering yes claims all of them — they were all judged to be him by the
 * same margin that makes the question worth asking at all.
 */
export function groupFaceGuesses(unidentified) {
  const rows = []
  const at = new Map()
  for (const f of unidentified || []) {
    const pid = f?.suggestion?.person_id
    if (!pid) continue
    const seen = at.get(pid)
    if (seen == null) {
      at.set(pid, rows.length)
      rows.push({
        person_id: pid,
        name: f.suggestion.name,
        score: f.suggestion.score,
        crop_url: f.crop_url,
        face_indexes: [f.face_index],
      })
      continue
    }
    const row = rows[seen]
    row.face_indexes.push(f.face_index)
    // Show the clearest crop of them, not whichever frame came first.
    if ((f.suggestion.score || 0) > (row.score || 0)) {
      row.score = f.suggestion.score
      row.crop_url = f.crop_url
    }
  }
  return rows
}

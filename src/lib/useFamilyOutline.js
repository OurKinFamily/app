import { useEffect, useState } from 'react'
import { getRelatives } from '../lib/api'

/**
 * A family arranged for nesting: who sits under whom.
 *
 * Two directions from one person. Upwards, each parent's own parents nest
 * beneath them — Ahnentafel makes that free, since the parents of slot n are
 * always 2n and 2n+1, so the whole pedigree is one flat list that nests
 * itself. Downwards, each child's children nest beneath them.
 *
 * Returned as lookup functions rather than a built tree, so the outline can
 * recurse as deep as the records go without this knowing how deep that is.
 */
export function useFamilyOutline(person, relatives, generations = 6) {
  const [ancestors, setAncestors] = useState(null)
  const [descendants, setDescendants] = useState({ forId: null, map: {} })

  useEffect(() => {
    let alive = true
    fetch(`/api/people/${person.id}/ancestors?generations=${generations}`)
      .then(r => (r.ok ? r.json() : { ancestors: [] }))
      .then(d => { if (alive) setAncestors(d.ancestors || []) })
      .catch(() => { if (alive) setAncestors([]) })
    return () => { alive = false }
  }, [person.id, generations])

  useEffect(() => {
    if (!relatives?.children?.length) return
    let alive = true
    Promise.all(relatives.children.map(c =>
      getRelatives(c.id)
        .then(r => [c.id, r.children || []])
        .catch(() => [c.id, []]),
    )).then(pairs => {
      // Stamped with whose grandchildren these are. Without it, opening
      // somebody childless left the PREVIOUS person's grandchildren on the
      // page — Diane, with no children, was shown eight of them, who were
      // really the last person's family.
      if (alive) setDescendants({ forId: person.id, map: Object.fromEntries(pairs) })
    })
    return () => { alive = false }
  }, [relatives, person.id])

  const bySlot = new Map((ancestors || []).map(a => [a.slot, a]))

  return {
    loading: ancestors === null,

    /** The parents of whoever is passed, by their pedigree slot. */
    parentsOf: node => {
      const slot = node?.slot ?? 1
      return [slot * 2, slot * 2 + 1]
        .map(s => bySlot.get(s))
        .filter(Boolean)
        .map(p => ({ ...p, removableAs: slot === 1 ? 'parent' : null }))
    },

    children: (relatives?.children || []).map(c => ({ ...c, removableAs: 'child' })),

    // Only this person's. A stale map from the last person viewed is worse
    // than none: it reads as a claim about a family.
    grandchildren: descendants.forId === person.id
      ? dedupe(Object.values(descendants.map).flat())
      : [],

    // Beside the subject rather than above or below. Kept apart because they
    // are different relationships: a sibling shares your parents, a spouse
    // starts a family with you, and lumping them under one heading made the
    // reader work out which was which from a small grey label.
    spouses: (relatives?.spouses || []).map(p => ({ ...p, removableAs: 'spouse' })),
    siblings: relatives?.siblings || [],
  }
}

/** Two of somebody's children can share a child; they appear once. */
const dedupe = people => {
  const seen = new Map()
  for (const p of people) if (p?.id && !seen.has(p.id)) seen.set(p.id, p)
  return [...seen.values()]
}

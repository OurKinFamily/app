import { useEffect, useState } from 'react'

/**
 * A person's scrapbook: their collections, their loose items, and whichever
 * collection is currently open.
 *
 * Collections nest, so this is keyed on the collection in the URL rather than
 * held as a stack — the address is the position, and a link into the middle of
 * somebody's scrapbook works.
 */
export function useScrapbook(personId, collectionId) {
  const [collections, setCollections] = useState(null)
  const [loose, setLoose] = useState(null)
  const [open, setOpen] = useState({ forId: null, detail: null, items: null })

  useEffect(() => {
    let alive = true
    fetch(`/api/people/${personId}/collections`)
      .then(r => (r.ok ? r.json() : []))
      .then(d => { if (alive) setCollections(Array.isArray(d) ? d : []) })
      .catch(() => { if (alive) setCollections([]) })
    fetch(`/api/people/${personId}/items`)
      .then(r => (r.ok ? r.json() : { items: [] }))
      .then(d => { if (alive) setLoose((d.items || []).map(adapt)) })
      .catch(() => { if (alive) setLoose([]) })
    return () => { alive = false }
  }, [personId])

  useEffect(() => {
    if (!collectionId) return
    let alive = true
    Promise.all([
      fetch(`/api/collections/${collectionId}`).then(r => (r.ok ? r.json() : null)),
      fetch(`/api/collections/${collectionId}/items`).then(r => (r.ok ? r.json() : { items: [] })),
    ]).then(([detail, items]) => {
      // Stamped, so leaving a collection cannot leave its pages behind under
      // the next one — the mistake that showed one person another's family.
      if (alive) setOpen({ forId: collectionId, detail, items: (items.items || []).map(adapt) })
    })
    return () => { alive = false }
  }, [collectionId])

  const current = open.forId === collectionId ? open : { detail: null, items: null }

  return {
    loading: collections === null || loose === null,
    collections: collections || [],
    loose: loose || [],
    openDetail: current.detail,
    openItems: current.items,
    openLoading: Boolean(collectionId) && current.items === null,
  }
}

/** Heritage items say thumb_url; everything else in v2 says thumbnail_url. */
const adapt = it => ({ ...it, thumbnail_url: it.thumb_url })

/**
 * What a collection actually holds.
 *
 * A parent holding only sub-collections would otherwise read "0 items", which
 * is both wrong and discouraging — the things are there, one level down.
 */
export function collectionCount(c) {
  const inside = c.child_count || 0
  const items = c.item_count || 0
  const deep = c.descendant_item_count ?? items
  if (inside && items) return `${inside} inside · ${items} ${c.is_series ? 'pages' : 'items'}`
  if (inside) return `${inside} inside · ${deep} ${c.is_series ? 'pages' : 'items'}`
  return `${items} ${c.is_series ? 'pages' : 'items'}`
}

/** Filter across everything shown on a card, so searching finds what it looks like. */
export const matches = (haystack, query) =>
  !query || haystack.filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase())

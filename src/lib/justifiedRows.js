const DEFAULT_ASPECT = 4 / 3

// Flickr/Google-Photos justified layout. Packs items into rows by aspect ratio,
// then scales each row's height so it fills containerWidth exactly (edge-to-edge).
// Each returned item carries its `aspect`; rows have a `height` and a `last` flag.
export function computeRows(items, containerWidth, { rowHeight = 200, gap = 4, defaultAspect = DEFAULT_ASPECT } = {}) {
  if (!containerWidth || !items.length) return []

  const rows = []
  let current = []
  let aspectSum = 0

  items.forEach(item => {
    const aspect = item.width && item.height ? item.width / item.height : defaultAspect
    current.push({ ...item, aspect })
    aspectSum += aspect
    const gaps = (current.length - 1) * gap
    if (aspectSum * rowHeight + gaps >= containerWidth) {
      rows.push({ items: current, height: Math.round((containerWidth - gaps) / aspectSum) })
      current = []
      aspectSum = 0
    }
  })

  if (current.length) rows.push({ items: current, height: rowHeight, last: true })
  return rows
}

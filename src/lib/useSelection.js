import { useState, useRef, useCallback } from 'react'

// Multi-select for the gallery grid. Tracks a Set of selected paths plus an
// anchor index for shift-click range selection. The ordered item list is
// passed in at toggle time (the gallery owns its order), so this hook stays
// decoupled from layout.
//
//   const sel = useSelection()
//   sel.toggle(item, index, shiftKey, orderedItems)
//   sel.selected / sel.count / sel.selectedPaths / sel.clear()
export function useSelection() {
  const [selected, setSelected] = useState(() => new Set())
  const anchorRef = useRef(null)

  const toggle = useCallback((item, index, shiftKey, orderedItems) => {
    setSelected(prev => {
      const next = new Set(prev)
      const canRange = shiftKey && anchorRef.current != null && Number.isInteger(index) && Array.isArray(orderedItems)
      if (canRange) {
        // Shift extends a contiguous range from the anchor to the clicked tile
        // (inclusive), always selecting — anchor stays put for further extends.
        const lo = Math.min(anchorRef.current, index)
        const hi = Math.max(anchorRef.current, index)
        for (let i = lo; i <= hi; i++) {
          const p = orderedItems[i]?.path
          if (p) next.add(p)
        }
      } else {
        if (next.has(item.path)) next.delete(item.path)
        else next.add(item.path)
        anchorRef.current = index
      }
      return next
    })
  }, [])

  const clear = useCallback(() => {
    setSelected(new Set())
    anchorRef.current = null
  }, [])

  return {
    selected,
    count: selected.size,
    selectedPaths: [...selected],
    toggle,
    clear,
  }
}

import { useState, useRef, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Leading } from './Leading'

// Searchable select / combobox. Each option: { value, text, label?, avatar?, icon?, initials? }
//   text  = plain string (input display, initials, filtering)
//   label = display node (defaults to text)
//   avatar | icon | initials → leading visual (via Leading)
// single:  value = a value,        onChange(option)
// multiple value = array of values, onChange(array of options)   — set `multiple`
// Filtering is internal by default; pass onQueryChange to drive it externally (async).
export function Select({ options = [], value, onChange, onQueryChange, placeholder = 'Search…', multiple = false, autoFocus = false, className }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const selectedValues = multiple ? new Set(value || []) : null
  const selectedMulti = multiple ? (value || []).map(v => options.find(o => o.value === v)).filter(Boolean) : []
  const selectedSingle = !multiple ? options.find(o => o.value === value) : null

  const filtered = onQueryChange
    ? options
    : options.filter(o => (o.text || '').toLowerCase().includes(query.toLowerCase()))

  const handleQuery = q => { setQuery(q); onQueryChange?.(q); setOpen(true) }

  const handleSelect = o => {
    if (multiple) {
      const next = selectedValues.has(o.value)
        ? selectedMulti.filter(s => s.value !== o.value)
        : [...selectedMulti, o]
      onChange?.(next)
      setQuery('')
    } else {
      onChange?.(o)
      setOpen(false)
      setQuery('')
    }
  }

  const removeChip = (o, e) => { e.stopPropagation(); onChange?.(selectedMulti.filter(s => s.value !== o.value)) }

  return (
    <div ref={ref} className={cn('relative', className)}>
      {multiple ? (
        <div
          onClick={() => setOpen(true)}
          className="flex w-full flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 focus-within:border-white/30"
        >
          {selectedMulti.map(o => (
            <span key={o.value} className="flex items-center gap-1 rounded-full bg-white/10 py-0.5 pl-1 pr-1.5 text-[12px] text-white">
              <Leading avatar={o.avatar} icon={o.icon} initials={o.initials} text={o.text || ''} size="sm" />
              <span className="max-w-[120px] truncate">{o.text}</span>
              <button type="button" onClick={e => removeChip(o, e)} className="text-white/40 hover:text-white" aria-label="Remove">
                <X size={12} />
              </button>
            </span>
          ))}
          <input
            autoFocus={autoFocus}
            value={query}
            onChange={e => handleQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={selectedMulti.length ? '' : placeholder}
            className="min-w-[80px] flex-1 bg-transparent py-1 text-base text-white caret-white placeholder-white/25 outline-none md:text-[13px]"
          />
        </div>
      ) : (
        <input
          autoFocus={autoFocus}
          value={open ? query : (selectedSingle?.text || '')}
          onChange={e => handleQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-base text-white caret-white placeholder-white/25 outline-none focus:border-white/40 md:text-[13px]"
        />
      )}

      {open && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-white/10 bg-zinc-900 py-1 shadow-xl">
          {filtered.length === 0 && <p className="px-3 py-2 text-[12px] text-white/30">No results</p>}
          {filtered.map(o => {
            const isSel = multiple ? selectedValues.has(o.value) : o.value === value
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => handleSelect(o)}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors',
                  isSel ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white',
                )}
              >
                <Leading avatar={o.avatar} icon={o.icon} initials={o.initials} text={o.text || ''} size="sm" />
                <span className="min-w-0 flex-1 truncate">{o.label ?? o.text}</span>
                {multiple && isSel && <Check size={14} className="shrink-0 text-white/60" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

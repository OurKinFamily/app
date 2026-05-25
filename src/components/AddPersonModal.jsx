import { useState } from 'react'
import { createPerson } from '../lib/api'
import { useEscToClose } from '../lib/hooks'

export function AddPersonModal({ onClose, onCreated }) {
  useEscToClose(onClose)
  const [name, setName]         = useState('')
  const [knownAs, setKnownAs]   = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const person = await createPerson({
        name: name.trim(),
        known_as: knownAs.trim() || null,
        birth_date: birthDate.trim() || null,
        birth_date_precision: birthDate.trim() ? 'year' : null,
      })
      onCreated(person)
    } catch (err) {
      setError('Failed to create person')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-zinc-900 border border-white/10 rounded-xl w-[420px] max-w-[95vw] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-white">Add Person</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 text-lg leading-none transition-colors">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[12px] text-white/40 mb-1.5">Full name <span className="text-white/20">*</span></label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Margaret Young"
              className="w-full bg-white/5 border border-white/10 rounded-lg text-white text-[13px] px-3 py-2 outline-none focus:border-white/30 transition-colors placeholder:text-white/20"
            />
          </div>
          <div>
            <label className="block text-[12px] text-white/40 mb-1.5">Known as <span className="text-white/20">optional</span></label>
            <input
              type="text"
              value={knownAs}
              onChange={e => setKnownAs(e.target.value)}
              placeholder="e.g. Grandma Young"
              className="w-full bg-white/5 border border-white/10 rounded-lg text-white text-[13px] px-3 py-2 outline-none focus:border-white/30 transition-colors placeholder:text-white/20"
            />
          </div>
          <div>
            <label className="block text-[12px] text-white/40 mb-1.5">Birth year <span className="text-white/20">optional</span></label>
            <input
              type="text"
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              placeholder="e.g. 1942"
              className="w-full bg-white/5 border border-white/10 rounded-lg text-white text-[13px] px-3 py-2 outline-none focus:border-white/30 transition-colors placeholder:text-white/20"
            />
          </div>

          {error && <p className="text-[12px] text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-[13px] text-white/40 hover:text-white/70 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-4 py-1.5 bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white text-[13px] rounded-lg transition-colors"
            >
              {saving ? 'Adding…' : 'Add person'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

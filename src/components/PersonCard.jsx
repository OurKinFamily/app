import { useState } from 'react'
import { AvatarPicker } from './AvatarPicker'

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export function PersonCard({ person: initialPerson, onClick }) {
  const [person, setPerson] = useState(initialPerson)
  const [pickerOpen, setPickerOpen] = useState(false)

  const handleAvatarClick = (e) => {
    e.stopPropagation()
    setPickerOpen(true)
  }

  return (
    <>
      <div
        onClick={() => onClick(person)}
        className="cursor-pointer rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition flex items-center gap-3"
      >
        <div
          className="relative group w-10 h-10 shrink-0 cursor-pointer"
          onClick={handleAvatarClick}
        >
          {person.avatar ? (
            <img
              src={`/api/media/${person.avatar}`}
              alt=""
              className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-sm font-medium ring-1 ring-white/10">
              {initials(person.name)}
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828A2 2 0 0110 16.414H8v-2a2 2 0 01.586-1.414z" />
            </svg>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-base font-medium text-white truncate">
            {person.known_as || person.name}
          </p>
          {person.known_as && person.known_as !== person.name && (
            <p className="text-sm text-white/50 truncate">{person.name}</p>
          )}
          {person.birth_date && (
            <p className="mt-0.5 text-xs text-white/40">b. {person.birth_date}</p>
          )}
        </div>
      </div>

      {pickerOpen && (
        <AvatarPicker
          person={person}
          onClose={() => setPickerOpen(false)}
          onSaved={(cropPath) => setPerson(p => ({ ...p, avatar: cropPath }))}
        />
      )}
    </>
  )
}

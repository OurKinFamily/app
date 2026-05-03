export function PersonCard({ person, onClick }) {
  return (
    <div
      onClick={() => onClick(person)}
      className="cursor-pointer rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
    >
      <p className="text-lg font-medium text-white">
        {person.known_as || person.name}
      </p>
      <p className="text-sm text-white/50">{person.name}</p>
      {person.birth_date && (
        <p className="mt-1 text-xs text-white/40">b. {person.birth_date}</p>
      )}
    </div>
  )
}

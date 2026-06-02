import { useMe } from '../contexts/MeContext'
import { Avatar } from './Avatar'
import { mediaUrl } from '../lib/media'

const VIEWER_PEOPLE = [
  { id: 'e86a4c66-1df8-49ce-aca3-5b0ac64399b2', name: 'Cayce Ward Young',    known_as: 'Cayce',   avatar: '__faces/crops/0000/2025-04-04_17-12-18_IMG_1053.jpg_face0.jpg' },
  { id: '8bca6cf0-f0fe-4511-b90e-c4af2ba7e6e1', name: 'Henry F Young',       known_as: 'Henry',   avatar: '__faces/crops/0000/2025-06-17_07-49-48_IMG_2437.jpg_face0.jpg' },
  { id: '3c92c2a7-6699-4393-8fc6-8a9b795f6122', name: 'Amelia Rose Young',   known_as: 'Amelia',  avatar: '__faces/crops/2025/04/2025-04-03_10-16-58_001.jpg_face0.jpg' },
  { id: '011ac7dc-a633-4ab3-80c3-937f1b20865f', name: 'Margaret L Young',    known_as: 'Margaret', avatar: '__faces/crops/2021/01/2021-01-06_10-58-24_001.jpg_face0.jpg' },
  { id: '3d74152e-793b-4ec7-894a-e35a5404e8a3', name: 'Patricia Ann Forrence', known_as: 'Patty', avatar: null },
]

export function ViewerPreviewBadge() {
  const { me, previewPersonId, previewAsViewer, setPreviewPersonId } = useMe()

  if (!me?.is_admin) return null

  const activePerson = VIEWER_PEOPLE.find(p => p.id === previewPersonId)

  return (
    <div className="fixed bottom-20 right-4 z-50 md:bottom-6">
      <div className="flex flex-col items-end gap-2">
        {/* Active banner */}
        {previewAsViewer && (
          <div className="flex items-center gap-2 rounded-full bg-amber-500 px-3 py-1.5 text-[12px] font-medium text-black shadow-lg">
            <span>Viewing as {activePerson?.known_as ?? 'viewer'}</span>
            <button
              onClick={() => setPreviewPersonId(null)}
              className="rounded-full bg-black/15 px-2 py-0.5 text-[11px] hover:bg-black/25 transition-colors"
            >
              Back to me
            </button>
          </div>
        )}

        {/* Person picker */}
        <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 shadow-lg backdrop-blur">
          <span className="mr-1 text-[10px] text-white/40">View as</span>
          {VIEWER_PEOPLE.map(p => (
            <button
              key={p.id}
              onClick={() => setPreviewPersonId(previewPersonId === p.id ? null : p.id)}
              title={p.known_as}
              className={`rounded-full ring-2 transition-all ${previewPersonId === p.id ? 'ring-amber-400 scale-110' : 'ring-transparent opacity-60 hover:opacity-100'}`}
            >
              <Avatar
                src={p.avatar ? mediaUrl(p.avatar) : null}
                name={p.name}
                size="xs"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

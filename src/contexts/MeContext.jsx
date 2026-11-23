/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'

const MeContext = createContext({
  isAdmin: false, me: null, loading: true,
})

export function MeProvider({ children }) {
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/me')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { setMe(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])



  const isAdmin = me?.is_admin ?? false
  // Whose perspective relationship lines are computed from — the logged-in
  // family member's own node.
  const viewerPersonId = me?.person?.id || null
  // Whether the archive can be changed from here at all. The deployed
  // containers mount /photos read-only — on purpose, it is what stands between
  // a bug and 150,000 files that exist nowhere else — so rotate, crop, tone
  // and restore only work against a local archive. The server answers by
  // testing the mount rather than by carrying a flag, and the controls are
  // hidden rather than offered and then failing.
  const canEditMedia = isAdmin && (me?.can_edit_media ?? false)

  return (
    <MeContext.Provider value={{ isAdmin, canEditMedia, me, loading, viewerPersonId }}>
      {children}
    </MeContext.Provider>
  )
}

export const useMe = () => useContext(MeContext)
export const useIsAdmin = () => useContext(MeContext).isAdmin
export const useCanEditMedia = () => useContext(MeContext).canEditMedia

// Where "home" is for the current user: gallery viewers land on the gallery;
// family members land on their own person page (or the People list if their
// email isn't mapped to a person yet).
export function homePath(me) {
  if (me?.can_see_gallery) return '/'
  if (me?.person?.id) return `/people/${me.person.id}/overview`
  return '/people'
}

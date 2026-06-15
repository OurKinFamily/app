/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'

const MeContext = createContext({
  isAdmin: false, me: null, loading: true,
  previewPersonId: null, setPreviewPersonId: () => {},
})

const PREVIEW_KEY = 'ourkin_preview_person_id'

export function MeProvider({ children }) {
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [previewPersonId, setPreviewPersonIdState] = useState(
    () => localStorage.getItem(PREVIEW_KEY) || null
  )

  useEffect(() => {
    fetch('/api/admin/me')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { setMe(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // While "View as <family member>" is active, tag every /api request so the
  // server treats it as a non-admin family view — locked collections/bios then
  // actually hide, giving an accurate preview. Restores fetch when preview ends.
  useEffect(() => {
    if (!previewPersonId) return
    const orig = window.fetch
    window.fetch = (input, init = {}) => {
      const url = typeof input === 'string' ? input : (input?.url || '')
      if (url.startsWith('/api')) {
        init = { ...init, headers: { ...(init.headers || {}), 'X-Preview-As-Viewer': '1' } }
      }
      return orig(input, init)
    }
    return () => { window.fetch = orig }
  }, [previewPersonId])

  function setPreviewPersonId(id) {
    if (id) localStorage.setItem(PREVIEW_KEY, id)
    else localStorage.removeItem(PREVIEW_KEY)
    setPreviewPersonIdState(id || null)
  }

  const previewAsViewer = previewPersonId !== null
  const isAdmin = !previewAsViewer && (me?.is_admin ?? false)
  // Whose perspective relationship lines are computed from: an admin's chosen
  // "preview as" person, otherwise the logged-in family member's own node.
  const viewerPersonId = previewPersonId || me?.person?.id || null

  return (
    <MeContext.Provider value={{ isAdmin, me, loading, previewPersonId, previewAsViewer, viewerPersonId, setPreviewPersonId }}>
      {children}
    </MeContext.Provider>
  )
}

export const useMe = () => useContext(MeContext)
export const useIsAdmin = () => useContext(MeContext).isAdmin

// Where "home" is for the current user: gallery viewers land on the gallery;
// family members land on their own person page (or the People list if their
// email isn't mapped to a person yet).
export function homePath(me) {
  if (me?.can_see_gallery) return '/gallery'
  if (me?.person?.id) return `/manage/people/${me.person.id}/overview`
  return '/gallery/people'
}

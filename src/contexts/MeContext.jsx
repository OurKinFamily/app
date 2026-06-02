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

  function setPreviewPersonId(id) {
    if (id) localStorage.setItem(PREVIEW_KEY, id)
    else localStorage.removeItem(PREVIEW_KEY)
    setPreviewPersonIdState(id || null)
  }

  const previewAsViewer = previewPersonId !== null
  const isAdmin = !previewAsViewer && (me?.is_admin ?? false)

  return (
    <MeContext.Provider value={{ isAdmin, me, loading, previewPersonId, previewAsViewer, setPreviewPersonId }}>
      {children}
    </MeContext.Provider>
  )
}

export const useMe = () => useContext(MeContext)
export const useIsAdmin = () => useContext(MeContext).isAdmin

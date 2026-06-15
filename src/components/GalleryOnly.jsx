import { Navigate, Outlet } from 'react-router-dom'
import { useMe, homePath } from '../contexts/MeContext'

/**
 * Route guard for the full photo Gallery (and Places). Only the owner + Cayce
 * (`me.can_see_gallery`) get in; everyone else is sent to their home (their own
 * person page). Used as a layout route:
 *   <Route element={<GalleryOnly />}>
 *     <Route path="/gallery" element={<GalleryPage />} />
 *   </Route>
 */
export function GalleryOnly() {
  const { me, loading } = useMe()
  if (loading) return null
  if (!me?.can_see_gallery) return <Navigate to={homePath(me)} replace />
  return <Outlet />
}

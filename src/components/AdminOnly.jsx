import { Navigate, Outlet } from 'react-router-dom'
import { useMe } from '../contexts/MeContext'

/**
 * Route guard — wrap admin-only routes as a layout route:
 *   <Route element={<AdminOnly />}>
 *     <Route path="/admin/..." element={<AdminPage />} />
 *   </Route>
 *
 * Also usable as a UI guard:
 *   <AdminOnly>{children}</AdminOnly>  — renders nothing when not admin
 */
export function AdminOnly({ children }) {
  const { isAdmin, loading } = useMe()
  if (loading) return null
  if (!isAdmin) return children !== undefined ? null : <Navigate to="/gallery" replace />
  return children ?? <Outlet />
}

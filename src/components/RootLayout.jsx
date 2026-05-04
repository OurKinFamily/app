import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { ScrollToTop } from './ScrollToTop'

export function RootLayout() {
  return (
    <>
      <ScrollToTop />
      <Header />
      <div className="pt-12">
        <Outlet />
      </div>
    </>
  )
}

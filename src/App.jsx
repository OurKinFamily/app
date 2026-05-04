import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RootLayout } from './components/RootLayout'
import { HomeLayout } from './components/HomeLayout'
import { ManageLayout } from './components/ManageLayout'
import { AdminLayout } from './components/AdminLayout'
import { PeoplePage } from './pages/PeoplePage'
import { PersonPage } from './pages/PersonPage'
import { PersonOverview } from './pages/PersonOverview'
import { PersonAncestry } from './pages/PersonAncestry'
import { PersonGallery } from './pages/PersonGallery'
import { PersonScrapbook } from './pages/PersonScrapbook'
import { PersonTravel } from './pages/PersonTravel'
import { PersonAI } from './pages/PersonAI'
import { FacesPage } from './pages/FacesPage'
import { JobsPage } from './pages/JobsPage'
import { GalleryPage } from './pages/GalleryPage'
import { MediaPage } from './pages/MediaPage'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
        <Route path="/" element={<Navigate to="/gallery" replace />} />
        <Route element={<HomeLayout />}>
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/gallery/media" element={<MediaPage />} />
        </Route>
        <Route path="/manage" element={<ManageLayout />}>
          <Route path="people" element={<PeoplePage />} />
          <Route path="faces" element={<FacesPage />} />
        </Route>
        <Route path="/manage/people/:id" element={<PersonPage />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview"   element={<PersonOverview />} />
          <Route path="ancestry"   element={<PersonAncestry />} />
          <Route path="gallery"    element={<PersonGallery />} />
          <Route path="scrapbook"  element={<PersonScrapbook />} />
          <Route path="travel"     element={<PersonTravel />} />
          <Route path="ai"         element={<PersonAI />} />
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="jobs" element={<JobsPage />} />
        </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

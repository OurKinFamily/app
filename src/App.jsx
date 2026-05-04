import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ManageLayout } from './components/ManageLayout'
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
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/manage/people" replace />} />
        <Route path="/manage" element={<ManageLayout />}>
          <Route path="people" element={<PeoplePage />} />
          <Route path="faces" element={<FacesPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="people/:id" element={<PersonPage />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview"   element={<PersonOverview />} />
          <Route path="ancestry"   element={<PersonAncestry />} />
          <Route path="gallery"    element={<PersonGallery />} />
          <Route path="scrapbook"  element={<PersonScrapbook />} />
          <Route path="travel"     element={<PersonTravel />} />
          <Route path="ai"         element={<PersonAI />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

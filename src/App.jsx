import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RootLayout } from './components/RootLayout'
import { HomeLayout } from './components/HomeLayout'
import { ManageLayout } from './components/ManageLayout'
import { AdminLayout } from './components/AdminLayout'
import { PeoplePage } from './pages/PeoplePage'
import { PersonPage } from './pages/PersonPage'
import { PersonOverview } from './pages/PersonOverview'
import { PersonAncestry } from './pages/PersonAncestry'
import { PersonScrapbook } from './pages/PersonScrapbook'
import { PersonTravel } from './pages/PersonTravel'
import { PersonAI } from './pages/PersonAI'
import { UnassignedFacesPage } from './pages/UnassignedFacesPage'
import { AssignedFacesPage } from './pages/AssignedFacesPage'
import { GroupsPage } from './pages/GroupsPage'
import { GroupPage } from './pages/GroupPage'
import { SimilarFacesPage } from './pages/SimilarFacesPage'
import { JobsPage } from './pages/JobsPage'
import { AdminOverviewPage } from './pages/AdminOverviewPage'
import { GalleryPage } from './pages/GalleryPage'
import { PlacesPage } from './pages/PlacesPage'
import { ScrapbookPage } from './pages/ScrapbookPage'
import { SuggestionsPage } from './pages/SuggestionsPage'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
        <Route path="/" element={<Navigate to="/gallery" replace />} />
        <Route element={<HomeLayout />}>
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/gallery/places" element={<PlacesPage />} />
          <Route path="/gallery/people" element={<PeoplePage />} />
          <Route path="/gallery/scrapbook" element={<ScrapbookPage />} />
        </Route>
        <Route path="/manage" element={<ManageLayout />}>
          <Route path="people" element={<Navigate to="/gallery/people" replace />} />
          <Route path="faces" element={<Navigate to="/manage/faces/unassigned" replace />} />
          <Route path="faces/unassigned" element={<UnassignedFacesPage />} />
          <Route path="faces/assigned" element={<AssignedFacesPage />} />
          <Route path="groups" element={<GroupsPage />} />
          <Route path="groups/:id" element={<GroupPage />} />
          <Route path="suggestions" element={<SuggestionsPage />} />
          <Route path="faces/similar" element={<SimilarFacesPage />} />
        </Route>
        <Route path="/manage/people/:id" element={<PersonPage />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview"   element={<PersonOverview />} />
          <Route path="ancestry"   element={<PersonAncestry />} />
          <Route path="scrapbook"  element={<PersonScrapbook />} />
          <Route path="travel"     element={<PersonTravel />} />
          <Route path="ai"         element={<PersonAI />} />
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<AdminOverviewPage />} />
          <Route path="jobs" element={<JobsPage />} />
        </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

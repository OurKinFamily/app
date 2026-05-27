import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RootLayout } from './components/RootLayout'
import { MainLayout } from './components/MainLayout'
import { PeoplePage } from './pages/PeoplePage'
import { PersonPage } from './pages/PersonPage'
import { PersonOverview } from './pages/PersonOverview'
import { PersonCircles } from './pages/PersonCircles'
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
import { DesignPage } from './pages/DesignPage'
import { LightboxPage } from './pages/LightboxPage'
import { AlbumsPage } from './pages/AlbumsPage'
import { FavoritesPage } from './pages/FavoritesPage'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/gallery" replace />} />

            <Route path="/gallery" element={<GalleryPage />}>
              <Route path="photo/*" element={<LightboxPage />} />
            </Route>
            <Route path="/gallery/:year" element={<GalleryPage />}>
              <Route path="photo/*" element={<LightboxPage />} />
            </Route>
            <Route path="/gallery/places" element={<PlacesPage />} />
            <Route path="/gallery/people" element={<PeoplePage />} />
            <Route path="/gallery/scrapbook" element={<ScrapbookPage />} />
            <Route path="/gallery/albums" element={<AlbumsPage />} />
            <Route path="/gallery/favorites" element={<FavoritesPage />} />
            <Route path="/design" element={<DesignPage />} />

            <Route path="/manage" element={<Navigate to="/manage/faces/unassigned" replace />} />
            <Route path="/manage/people" element={<Navigate to="/gallery/people" replace />} />
            <Route path="/manage/faces" element={<Navigate to="/manage/faces/unassigned" replace />} />
            <Route path="/manage/faces/unassigned" element={<UnassignedFacesPage />} />
            <Route path="/manage/faces/assigned" element={<AssignedFacesPage />} />
            <Route path="/manage/faces/similar" element={<SimilarFacesPage />} />
            <Route path="/manage/groups" element={<GroupsPage />} />
            <Route path="/manage/groups/:id" element={<GroupPage />} />
            <Route path="/manage/suggestions" element={<SuggestionsPage />} />

            <Route path="/manage/people/:id" element={<PersonPage />}>
              <Route index            element={<Navigate to="overview" replace />} />
              <Route path="overview"  element={<PersonOverview />} />
              <Route path="circles"   element={<PersonCircles />} />
              <Route path="ancestry"  element={<PersonAncestry />} />
              <Route path="scrapbook" element={<PersonScrapbook />} />
              <Route path="scrapbook/:collectionId" element={<PersonScrapbook />} />
              <Route path="travel"    element={<PersonTravel />} />
              <Route path="ai"        element={<PersonAI />} />
            </Route>

            <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
            <Route path="/admin/overview" element={<AdminOverviewPage />} />
            <Route path="/admin/jobs" element={<JobsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

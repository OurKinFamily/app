import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RootLayout } from './components/RootLayout'
import { MainLayout } from './components/MainLayout'
import { ToastProvider } from './components/Toast'
import { MeProvider, useMe, homePath } from './contexts/MeContext'
import { AdminOnly } from './components/AdminOnly'
import { GalleryOnly } from './components/GalleryOnly'
import { ViewerPreviewBadge } from './components/ViewerPreviewBadge'
import { PeoplePage } from './pages/PeoplePage'
import { BiographiesPage } from './pages/BiographiesPage'
import { PersonPage } from './pages/PersonPage'
import { PersonOverview } from './pages/PersonOverview'
import { PersonBiography } from './pages/PersonBiography'
import { PersonCircles } from './pages/PersonCircles'
import { PersonTimeline } from './pages/PersonTimeline'
import { PersonAncestry } from './pages/PersonAncestry'
import { PersonScrapbook } from './pages/PersonScrapbook'
import { PersonTravel } from './pages/PersonTravel'
import { PersonAI } from './pages/PersonAI'
import { UnassignedFacesPage } from './pages/UnassignedFacesPage'
import { FaceSuggestionsPage } from './pages/FaceSuggestionsPage'
import { AssignedFacesPage } from './pages/AssignedFacesPage'
import { GroupsPage } from './pages/GroupsPage'
import { GroupPage } from './pages/GroupPage'
import { SimilarFacesPage } from './pages/SimilarFacesPage'
import { JobsPage } from './pages/JobsPage'
import { AdminOverviewPage } from './pages/AdminOverviewPage'
import { FilesystemPage } from './pages/FilesystemPage'
import { HealthPage } from './pages/HealthPage'
import { MosaicPage } from './pages/MosaicPage'
import { GalleryPage } from './pages/GalleryPage'
import { UploadPage } from './pages/UploadPage'
import { PlacesPage } from './pages/PlacesPage'
import { ScrapbookPage } from './pages/ScrapbookPage'
import { SuggestionsPage } from './pages/SuggestionsPage'
import { DesignPage } from './pages/DesignPage'
import { V2Layout } from './v2/layouts/V2Layout'
import { V2GalleryPage } from './v2/pages/V2GalleryPage'
import { V2FavoritesPage } from './v2/pages/V2FavoritesPage'
import { V2AlbumsPage } from './v2/pages/V2AlbumsPage'
import { V2AlbumPage } from './v2/pages/V2AlbumPage'
import { V2PeoplePage } from './v2/pages/V2PeoplePage'
import { V2PlacesPage } from './v2/pages/V2PlacesPage'
import { V2FamilyPage } from './v2/pages/V2FamilyPage'
import { V2BiographiesPage } from './v2/pages/V2BiographiesPage'
import { V2PersonPage } from './v2/pages/V2PersonPage'
import { V2PersonOverview } from './v2/pages/V2PersonOverview'
import { V2PersonBiography } from './v2/pages/V2PersonBiography'
import { V2PersonCircles } from './v2/pages/V2PersonCircles'
import { V2PersonTimeline } from './v2/pages/V2PersonTimeline'
import { V2PersonAncestry } from './v2/pages/V2PersonAncestry'
import { V2PersonScrapbook } from './v2/pages/V2PersonScrapbook'
import { V2PersonTravel } from './v2/pages/V2PersonTravel'
import { V2AssignedFaces } from './v2/pages/V2AssignedFaces'
import { V2GroupsPage } from './v2/pages/V2GroupsPage'
import { V2FaceSuggestions } from './v2/pages/V2FaceSuggestions'
import { V2SimilarFaces } from './v2/pages/V2SimilarFaces'
import { V2JobsPage } from './v2/pages/V2JobsPage'
import { V2HealthPage } from './v2/pages/V2HealthPage'
import { V2MosaicPage } from './v2/pages/V2MosaicPage'
import { V2AnalyticsPage } from './v2/pages/V2AnalyticsPage'
import { LegacyPanel } from './v2/ui/LegacyPanel'
import { V2ComponentsPage } from './v2/pages/V2ComponentsPage'
import { V2GridDemoPage } from './v2/pages/V2GridDemoPage'
import { LightboxPage } from './pages/LightboxPage'
import { AlbumsPage } from './pages/AlbumsPage'
import { AlbumPage } from './pages/AlbumPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { FamilyPage } from './pages/FamilyPage'
import { SearchPage } from './pages/SearchPage'
import { HomePage } from './pages/HomePage'
import { MomChildhoodHomePage } from './pages/MomChildhoodHomePage'
import { GrandmaBeforeMomPage } from './pages/GrandmaBeforeMomPage'
import './index.css'

// "/" and the header "OK" logo both land here, then bounce to the right home for
// the user: the gallery for owner+Cayce, their own person page for family.
function LandingRedirect() {
  const { me, loading } = useMe()
  if (loading) return null
  return <Navigate to={homePath(me)} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <MeProvider>
        <ToastProvider>
          <Routes>
            <Route element={<RootLayout />}>
              {/* v2 reskin — deliberately OUTSIDE MainLayout, so it inherits no
                  header, sidebar, or bottom bar. A clean surface to design on.
                  Admin-only so family don't wander into half-built pages. */}
              <Route element={<AdminOnly />}>
                <Route element={<V2Layout />}>
                  <Route path="/v2" element={<V2GalleryPage />}>
                    <Route path="photo/*" element={null} />
                  </Route>
                  <Route path="/v2/favorites" element={<V2FavoritesPage />}>
                    <Route path="photo/*" element={null} />
                  </Route>
                  <Route path="/v2/design/components" element={<V2ComponentsPage />} />
                  <Route path="/v2/design/grid" element={<V2GridDemoPage />} />

                  {/* Not reskinned yet. Rather than a rail full of dead links,
                      each of these serves its v1 page inside the v2 shell —
                      the old page in the new frame. They look like what they
                      are: v1 styling on a light background, replaced one at a
                      time as each gets its own v2 pass. */}
                  <Route path="/v2/albums" element={<V2AlbumsPage />} />
                  <Route path="/v2/albums/:id" element={<V2AlbumPage />}>
                    <Route path="photo/*" element={null} />
                  </Route>
                  <Route path="/v2/people" element={<V2PeoplePage />} />

                  {/* One person. The shell is v2; the tabs are still v1, each
                      inside a panel that keeps the dark ground they were drawn
                      for. They come out of it one at a time. */}
                  <Route path="/v2/people/:id" element={<V2PersonPage />}>
                    <Route index element={<Navigate to="overview" replace />} />
                    <Route path="overview" element={<V2PersonOverview />} />
                    <Route path="biography" element={<V2PersonBiography />} />
                    <Route path="circles" element={<V2PersonCircles />} />
                    <Route path="timeline" element={<V2PersonTimeline />} />
                    <Route path="ancestry" element={<V2PersonAncestry />} />
                    <Route path="scrapbook" element={<V2PersonScrapbook />} />
                    <Route path="scrapbook/:collectionId" element={<V2PersonScrapbook />} />
                    <Route path="travel" element={<V2PersonTravel />} />
                  </Route>
                  <Route path="/v2/places" element={<V2PlacesPage />} />
                  <Route path="/v2/family" element={<V2FamilyPage />} />
                  <Route path="/v2/biographies" element={<V2BiographiesPage />} />
                  <Route path="/v2/scrapbook" element={<ScrapbookPage />} />
                  <Route path="/v2/search" element={<SearchPage />} />
                  <Route path="/v2/upload" element={<UploadPage />} />
                  <Route path="/v2/faces/suggestions" element={<V2FaceSuggestions />} />
                  <Route path="/v2/faces/unassigned" element={<UnassignedFacesPage />} />
                  <Route path="/v2/faces/assigned" element={<V2AssignedFaces />} />
                  <Route path="/v2/faces/similar" element={<V2SimilarFaces />} />
                  <Route path="/v2/groups" element={<V2GroupsPage />} />
                  <Route path="/v2/groups/:id" element={<LegacyPanel><GroupPage /></LegacyPanel>} />
                  <Route path="/v2/suggestions" element={<SuggestionsPage />} />
                  <Route path="/v2/admin/overview" element={<AdminOverviewPage />} />
                  <Route path="/v2/admin/analytics" element={<V2AnalyticsPage />} />
                  <Route path="/v2/admin/health" element={<V2HealthPage />} />
                  <Route path="/v2/admin/mosaic" element={<V2MosaicPage />} />
                  <Route path="/v2/admin/jobs" element={<V2JobsPage />} />
                </Route>
              </Route>

              <Route element={<MainLayout />}>
                {/* "/" goes back to /gallery as the default landing. The home-page
                    napkin POC + its demo rooms still live at /home/* for when we
                    pick the vision work back up. */}
                <Route path="/" element={<LandingRedirect />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/home/mom-childhood" element={<MomChildhoodHomePage />} />
                <Route path="/home/grandma-before-mom" element={<GrandmaBeforeMomPage />} />

                <Route path="/search" element={<SearchPage />} />

                {/* The full photo gallery + places are owner+Cayce only. */}
                <Route element={<GalleryOnly />}>
                  <Route path="/gallery" element={<GalleryPage />}>
                    <Route path="photo/*" element={<LightboxPage />} />
                  </Route>
                  <Route path="/gallery/:year" element={<GalleryPage />}>
                    <Route path="photo/*" element={<LightboxPage />} />
                  </Route>
                  <Route path="/gallery/places" element={<PlacesPage />} />
                  <Route path="/upload" element={<UploadPage />} />
                </Route>
                <Route path="/gallery/people" element={<PeoplePage />} />
                <Route path="/gallery/biographies" element={<BiographiesPage />} />
                <Route path="/gallery/scrapbook" element={<ScrapbookPage />} />
                <Route path="/gallery/albums" element={<AlbumsPage />} />
                <Route path="/gallery/albums/:id" element={<AlbumPage />} />
                <Route path="/gallery/favorites" element={<FavoritesPage />} />
                <Route path="/gallery/family" element={<FamilyPage />} />

                {/* Admin-only routes — redirect to /gallery when not admin */}
                <Route element={<AdminOnly />}>
                  <Route path="/design" element={<DesignPage />} />
                  <Route path="/manage" element={<Navigate to="/manage/faces/unassigned" replace />} />
                  <Route path="/manage/people" element={<Navigate to="/gallery/people" replace />} />
                  <Route path="/manage/faces" element={<Navigate to="/manage/faces/suggestions" replace />} />
                  <Route path="/manage/faces/suggestions" element={<FaceSuggestionsPage />} />
                  <Route path="/manage/faces/unassigned" element={<UnassignedFacesPage />} />
                  <Route path="/manage/faces/assigned" element={<AssignedFacesPage />} />
                  <Route path="/manage/faces/similar" element={<SimilarFacesPage />} />
                  <Route path="/manage/groups" element={<GroupsPage />} />
                  <Route path="/manage/groups/:id" element={<GroupPage />} />
                  <Route path="/manage/suggestions" element={<SuggestionsPage />} />
                  <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
                  <Route path="/admin/overview" element={<AdminOverviewPage />} />
                  <Route path="/admin/filesystem" element={<FilesystemPage />} />
                  <Route path="/admin/health" element={<HealthPage />} />
                  <Route path="/admin/mosaic" element={<MosaicPage />} />
                  <Route path="/admin/jobs" element={<JobsPage />} />
                </Route>

                <Route path="/manage/people/:id" element={<PersonPage />}>
                  <Route index            element={<Navigate to="overview" replace />} />
                  <Route path="overview"  element={<PersonOverview />} />
                  <Route path="biography" element={<PersonBiography />} />
                  <Route path="circles"   element={<PersonCircles />} />
                  <Route path="timeline"  element={<PersonTimeline />} />
                  <Route path="ancestry"  element={<PersonAncestry />} />
                  <Route path="scrapbook" element={<PersonScrapbook />} />
                  <Route path="scrapbook/:collectionId" element={<PersonScrapbook />} />
                  <Route path="travel"    element={<PersonTravel />} />
                  <Route path="ai"        element={<PersonAI />} />
                </Route>
              </Route>
            </Route>
          </Routes>
          <ViewerPreviewBadge />
        </ToastProvider>
      </MeProvider>
    </BrowserRouter>
  )
}

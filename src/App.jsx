import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { RootLayout } from './components/RootLayout'
import { ToastProvider } from './components/Toast'
import { MeProvider } from './contexts/MeContext'
import { AdminOnly } from './components/AdminOnly'
import { GalleryOnly } from './components/GalleryOnly'
import { Layout } from './layouts/Layout'
import { GalleryPage } from './pages/GalleryPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { AlbumsPage } from './pages/AlbumsPage'
import { AlbumPage } from './pages/AlbumPage'
import { PeoplePage } from './pages/PeoplePage'
import { PlacesPage } from './pages/PlacesPage'
import { FamilyPage } from './pages/FamilyPage'
import { BiographiesPage } from './pages/BiographiesPage'
import { PersonPage } from './pages/PersonPage'
import { PersonOverview } from './pages/PersonOverview'
import { PersonBiography } from './pages/PersonBiography'
import { PersonCircles } from './pages/PersonCircles'
import { PersonTimeline } from './pages/PersonTimeline'
import { PersonAncestry } from './pages/PersonAncestry'
import { PersonScrapbook } from './pages/PersonScrapbook'
import { PersonTravel } from './pages/PersonTravel'
import { AssignedFaces } from './pages/AssignedFaces'
import { GroupsPage } from './pages/GroupsPage'
import { FaceSuggestions } from './pages/FaceSuggestions'
import { SimilarFaces } from './pages/SimilarFaces'
import { JobsPage } from './pages/JobsPage'
import { HealthPage } from './pages/HealthPage'
import { MosaicPage } from './pages/MosaicPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { OverviewPage } from './pages/OverviewPage'
import { UnassignedFaces } from './pages/UnassignedFaces'
import { SuggestionsPage } from './pages/SuggestionsPage'
import { SearchPage } from './pages/SearchPage'
import { UploadPage } from './pages/UploadPage'
import { GroupPage } from './pages/GroupPage'
import { ScrapbookPage } from './pages/ScrapbookPage'
import { ComponentsPage } from './pages/ComponentsPage'
import { GridDemoPage } from './pages/GridDemoPage'
import { HomePage } from './pages/HomePage'
import { MomChildhoodHomePage } from './pages/MomChildhoodHomePage'
import { GrandmaBeforeMomPage } from './pages/GrandmaBeforeMomPage'
import './index.css'

/**
 * Paths that used to mean something else.
 *
 * The reskin took the root, so /gallery is now / and /manage/people is now
 * /people. None of these are allowed to 404: they are in bookmarks, in the
 * browser history of everybody who has used this, and in two years of notes.
 */
const MOVED = [
  ['/gallery', '/'],
  ['/manage', '/faces/suggestions'],
  ['/manage/people', '/people'],
  ['/manage/faces', '/faces/suggestions'],
  ['/admin/filesystem', '/admin/analytics'],
]

/**
 * Whatever is left of an old path, carried over to the new one.
 *
 * Catches the shapes a list cannot spell out — anything at all under /v2, and
 * the ids under /gallery and /manage. A person bookmarked as
 * /manage/people/abc/timeline lands on /people/abc/timeline rather than on a
 * shrug.
 */
function Moved({ strip }) {
  const { pathname, search } = useLocation()
  let rest = pathname.slice(strip.length) || '/'
  // /gallery/2019 was the gallery filtered to a year. The year is not part of
  // the path any more, so it lands on the gallery rather than on a /2019 that
  // has never existed. Spelling this as a route instead — /gallery/:year —
  // silently ate /gallery/people, because a dynamic segment outranks a splat.
  if (/^\/\d{4}(\/|$)/.test(rest)) rest = '/'
  return <Navigate to={`${rest}${search}`} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <MeProvider>
        <ToastProvider>
          <Routes>
            <Route element={<RootLayout />}>
              {/* The napkin POCs for the home-page vision. Full-bleed pages that bring
                  their own colour and chrome, so they hang off the root rather than
                  sitting inside the shell. */}
              <Route path="/home" element={<HomePage />} />
              <Route path="/home/mom-childhood" element={<MomChildhoodHomePage />} />
              <Route path="/home/grandma-before-mom" element={<GrandmaBeforeMomPage />} />

              <Route element={<Layout />}>
                {/* Open to everybody signed in: the people, what has been written about
                    them, and the collections somebody made on purpose. */}
                <Route path="/people" element={<PeoplePage />} />
                <Route path="/people/:id" element={<PersonPage />}>
                  <Route index element={<Navigate to="overview" replace />} />
                  <Route path="overview" element={<PersonOverview />} />
                  <Route path="biography" element={<PersonBiography />} />
                  <Route path="circles" element={<PersonCircles />} />
                  <Route path="timeline" element={<PersonTimeline />} />
                  <Route path="ancestry" element={<PersonAncestry />} />
                  <Route path="scrapbook" element={<PersonScrapbook />} />
                  <Route path="scrapbook/:collectionId" element={<PersonScrapbook />} />
                  <Route path="travel" element={<PersonTravel />} />
                </Route>
                <Route path="/biographies" element={<BiographiesPage />} />
                <Route path="/scrapbook" element={<ScrapbookPage />} />
                <Route path="/family" element={<FamilyPage />} />
                <Route path="/albums" element={<AlbumsPage />} />
                <Route path="/albums/:id" element={<AlbumPage />}>
                  <Route path="photo/*" element={null} />
                </Route>
                <Route path="/favorites" element={<FavoritesPage />}>
                  <Route path="photo/*" element={null} />
                </Route>
                <Route path="/search" element={<SearchPage />} />

                {/* The whole archive at once, and the ways into it. Owner and Cayce
                    only — everybody else is shown the people they know rather than
                    150,000 unsorted files. */}
                <Route element={<GalleryOnly />}>
                  <Route path="/" element={<GalleryPage />}>
                    <Route path="photo/*" element={null} />
                  </Route>
                  <Route path="/places" element={<PlacesPage />} />
                  <Route path="/upload" element={<UploadPage />} />
                </Route>

                {/* Back of house: the work of turning a pile of files into an archive.
                    Nothing here is for a family member. */}
                <Route element={<AdminOnly />}>
                  <Route path="/faces/suggestions" element={<FaceSuggestions />} />
                  <Route path="/faces/unassigned" element={<UnassignedFaces />} />
                  <Route path="/faces/assigned" element={<AssignedFaces />} />
                  <Route path="/faces/similar" element={<SimilarFaces />} />
                  <Route path="/groups" element={<GroupsPage />} />
                  <Route path="/groups/:id" element={<GroupPage />} />
                  <Route path="/suggestions" element={<SuggestionsPage />} />
                  <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
                  <Route path="/admin/overview" element={<OverviewPage />} />
                  <Route path="/admin/analytics" element={<AnalyticsPage />} />
                  <Route path="/admin/health" element={<HealthPage />} />
                  <Route path="/admin/mosaic" element={<MosaicPage />} />
                  <Route path="/admin/jobs" element={<JobsPage />} />
                  <Route path="/design" element={<Navigate to="/design/components" replace />} />
                  <Route path="/design/components" element={<ComponentsPage />} />
                  <Route path="/design/grid" element={<GridDemoPage />} />
                </Route>

                {/* Where the app used to live. */}
                {MOVED.map(([from, to]) => (
                  <Route key={from} path={from} element={<Navigate to={to} replace />} />
                ))}
                <Route path="/v2/*" element={<Moved strip="/v2" />} />
                <Route path="/gallery/*" element={<Moved strip="/gallery" />} />
                <Route path="/manage/*" element={<Moved strip="/manage" />} />
              </Route>
            </Route>
          </Routes>
        </ToastProvider>
      </MeProvider>
    </BrowserRouter>
  )
}

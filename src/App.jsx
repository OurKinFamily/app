import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { RootLayout } from './components/RootLayout'
import { ToastProvider } from './components/Toast'
import { MeProvider } from './contexts/MeContext'
import { AdminOnly } from './components/AdminOnly'
import { GalleryOnly } from './components/GalleryOnly'
import { ViewerPreviewBadge } from './components/ViewerPreviewBadge'
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
import { V2OverviewPage } from './v2/pages/V2OverviewPage'
import { V2UnassignedFaces } from './v2/pages/V2UnassignedFaces'
import { V2SuggestionsPage } from './v2/pages/V2SuggestionsPage'
import { V2SearchPage } from './v2/pages/V2SearchPage'
import { V2UploadPage } from './v2/pages/V2UploadPage'
import { V2GroupPage } from './v2/pages/V2GroupPage'
import { V2ScrapbookPage } from './v2/pages/V2ScrapbookPage'
import { V2ComponentsPage } from './v2/pages/V2ComponentsPage'
import { V2GridDemoPage } from './v2/pages/V2GridDemoPage'
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

              <Route element={<V2Layout />}>
                {/* Open to everybody signed in: the people, what has been written about
                    them, and the collections somebody made on purpose. */}
                <Route path="/people" element={<V2PeoplePage />} />
                <Route path="/people/:id" element={<V2PersonPage />}>
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
                <Route path="/biographies" element={<V2BiographiesPage />} />
                <Route path="/scrapbook" element={<V2ScrapbookPage />} />
                <Route path="/family" element={<V2FamilyPage />} />
                <Route path="/albums" element={<V2AlbumsPage />} />
                <Route path="/albums/:id" element={<V2AlbumPage />}>
                  <Route path="photo/*" element={null} />
                </Route>
                <Route path="/favorites" element={<V2FavoritesPage />}>
                  <Route path="photo/*" element={null} />
                </Route>
                <Route path="/search" element={<V2SearchPage />} />

                {/* The whole archive at once, and the ways into it. Owner and Cayce
                    only — everybody else is shown the people they know rather than
                    150,000 unsorted files. */}
                <Route element={<GalleryOnly />}>
                  <Route path="/" element={<V2GalleryPage />}>
                    <Route path="photo/*" element={null} />
                  </Route>
                  <Route path="/places" element={<V2PlacesPage />} />
                  <Route path="/upload" element={<V2UploadPage />} />
                </Route>

                {/* Back of house: the work of turning a pile of files into an archive.
                    Nothing here is for a family member. */}
                <Route element={<AdminOnly />}>
                  <Route path="/faces/suggestions" element={<V2FaceSuggestions />} />
                  <Route path="/faces/unassigned" element={<V2UnassignedFaces />} />
                  <Route path="/faces/assigned" element={<V2AssignedFaces />} />
                  <Route path="/faces/similar" element={<V2SimilarFaces />} />
                  <Route path="/groups" element={<V2GroupsPage />} />
                  <Route path="/groups/:id" element={<V2GroupPage />} />
                  <Route path="/suggestions" element={<V2SuggestionsPage />} />
                  <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
                  <Route path="/admin/overview" element={<V2OverviewPage />} />
                  <Route path="/admin/analytics" element={<V2AnalyticsPage />} />
                  <Route path="/admin/health" element={<V2HealthPage />} />
                  <Route path="/admin/mosaic" element={<V2MosaicPage />} />
                  <Route path="/admin/jobs" element={<V2JobsPage />} />
                  <Route path="/design" element={<Navigate to="/design/components" replace />} />
                  <Route path="/design/components" element={<V2ComponentsPage />} />
                  <Route path="/design/grid" element={<V2GridDemoPage />} />
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
          <ViewerPreviewBadge />
        </ToastProvider>
      </MeProvider>
    </BrowserRouter>
  )
}

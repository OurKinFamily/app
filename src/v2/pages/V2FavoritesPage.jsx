import { V2GalleryPage } from './V2GalleryPage'

/**
 * Favourites — the gallery with one more filter.
 *
 * Not a separate implementation: the same timeline, the same scrubber, the
 * same tiles and lightbox, differing only in the query string every fetch
 * carries. The filter is applied by the API's shared filter builder, so the
 * counts driving the layout cannot disagree with the items that arrive.
 *
 * No confidence filter. The gallery hides badly-dated photographs because
 * there are thousands of them; here somebody has deliberately picked out
 * eleven, and hiding one for a shaky timestamp would be perverse.
 *
 * No undated section either — that belongs to the whole archive, and a
 * favourite with no date simply sits in the timeline with the rest.
 */
export function V2FavoritesPage() {
  return (
    <V2GalleryPage
      title="Favourites"
      params="favorites=true&min_confidence=all"
      basePath="/v2/favorites"
      showUndated={false}
      emptyMessage="No favourites yet. Tap the heart on a photograph to keep it here."
    />
  )
}

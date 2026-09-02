import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

/**
 * Where the photograph was taken.
 *
 * Static and non-interactive: it answers "where was this" at a glance, and a
 * map you can accidentally pan while reading a panel is a nuisance rather than
 * a feature. Panning belongs on the Places page, which exists for it.
 *
 * A CircleMarker rather than Leaflet's default pin, so there are no marker
 * image assets to break under a bundler — the usual reason a Leaflet map
 * renders with a missing-image icon in the middle of it.
 */
export function PlaceMap({ lat, lng, height = 150, zoom = 13 }) {
  if (lat == null || lng == null) return null

  return (
    <div
      style={{
        height, width: '100%', overflow: 'hidden',
        // Its own stacking context, so Leaflet's internal z-indexes stay
        // inside it rather than competing with the panel around it.
        position: 'relative', zIndex: 0, isolation: 'isolate',
      }}
    >
      <MapContainer
        // Remount on a new position: Leaflet will not re-centre a live map
        // from a changed prop, so switching photographs would leave you
        // looking at the previous one's location.
        key={`${lat},${lng}`}
        center={[lat, lng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        keyboard={false}
        attributionControl={false}
      >
        {/* Esri's light canvas: quiet enough to sit inside a panel without
            competing with the photograph next to it. Keyless, like the one the
            travel map moved to when CARTO started demanding an API key. */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          maxNativeZoom={16}
          maxZoom={19}
        />
        <CircleMarker
          center={[lat, lng]}
          radius={6}
          pathOptions={{
            color: '#fff', weight: 2,
            fillColor: '#e8384f', fillOpacity: 1,
          }}
        />
      </MapContainer>
    </div>
  )
}

import { Camera } from 'lucide-react'
import { Row, SectionLabel } from './InfoPanelParts'
import { C } from './tokens'

/**
 * The camera and what it was set to.
 *
 * Its own section rather than sitting among the details: exposure is about the
 * camera, not the occasion, and in a family archive that is supporting
 * evidence rather than the point.
 */
export function ExposureSection({ camera: cam, settings: set }) {
  if (!cam && !set) return null
  return (
    <>
    <SectionLabel>Exposure</SectionLabel>
    <Row
      icon={Camera}
      primary={[cam.make, cam.model].filter(Boolean).join(' ') || null}
      secondary={cam.lens}
    />
    {/* No icons here: they sit under the camera they belong to, aligned to
        its label. A column of seven different glyphs for one exposure was
        more decoration than information. */}
    {[
      set.aperture ? `ƒ/${set.aperture}` : null,
      set.shutterSpeed,
      [set.focalLength, set.focalLength35mm && `(${set.focalLength35mm} equivalent)`]
        .filter(Boolean).join(' '),
      set.iso ? `ISO ${set.iso}` : null,
      set.flash,
      cam.software ? `Software ${cam.software}` : null,
    ].filter(Boolean).map(line => (
      <div
        key={line}
        style={{
        // 16px icon + 14px gap: lines up with the camera's name above.
        paddingLeft: 30, fontSize: 12.5, color: C.muted, paddingBottom: 3,
        }}
      >
        {line}
      </div>
    ))}
    </>
  )
}

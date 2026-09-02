/**
 * Every face in a photograph, named or not, as one list.
 *
 * The detail endpoint keeps them apart — `people` are those somebody has
 * identified, `unidentified` are the rest — but the boxes drawn over the
 * picture want them together: they are the same faces, and the only
 * difference is whether the question has been answered yet.
 *
 * Anything without a box is dropped. A face recorded with no coordinates
 * cannot be drawn, and an undefined box positions an outline in the corner.
 */
export function facesFrom(detail) {
  return [
    ...(detail?.people || []).map(p => ({
      face_index: p.face_index,
      bbox: p.bbox,
      name: p.known_as || p.name,
    })),
    ...(detail?.unidentified || []).map(f => ({
      face_index: f.face_index,
      bbox: f.bbox,
      name: null,
      crop_url: f.crop_url,
    })),
  ].filter(f => f.bbox)
}

import { useCallback } from 'react'
import { MediaDetail } from '../MediaDetail'
import { useMediaActions } from '../../lib/useMediaActions'
import { isVideo, mediaUrl } from '../../lib/media'

/**
 * The whole photograph behind a face, opened from the review page.
 *
 * `MediaDetail` is presentational: every edit is a prop, and the info panel
 * calls them with `?.()`. The review page passed only the item and a way to
 * close, so naming the person, fixing the date, moving the pin and writing a
 * description all opened, accepted an answer, and threw it away — the panel
 * was a decoy. Worse place for it than most: you open this view precisely
 * because the crop was not enough to decide, so this is exactly where you
 * want to name somebody.
 *
 * Editing the file itself — rotate, crop, light, restore, delete — is left
 * out on purpose. Those are gated on their handlers, so no button appears,
 * and they need a grid to report new dimensions back to. This page has none.
 */
export function SuggestionPhoto({ path, onClose, onFaceChange }) {
  const actions = useMediaActions({ openPath: path, close: onClose })

  // Naming somebody here means one fewer unnamed face. Refresh the headline
  // count, but leave the suggestions standing: they were scored against the
  // archive as it was, and re-running that costs twenty-five seconds.
  const afterFace = useCallback(fn => async (...args) => {
    await fn(...args)
    onFaceChange?.()
  }, [onFaceChange])

  return (
    <MediaDetail
      item={{
        path,
        url: mediaUrl(path),
        // Faces are pulled from video frames as well as photographs, and a
        // .mov inside an <img> renders nothing at all.
        is_video: isVideo(path),
        thumbnail_url: isVideo(path) ? mediaUrl(`${path}.poster.jpg`) : mediaUrl(path),
        filename: path.split('/').pop(),
      }}
      onClose={onClose}
      onAssignFace={afterFace(actions.assignFace)}
      onCreatePerson={afterFace(actions.createPerson)}
      onDismissFace={afterFace(actions.dismissFace)}
      onUnassignFace={afterFace(actions.unassignFace)}
      onRejectGuess={afterFace(actions.rejectGuess)}
      onRedate={actions.redate}
      onRelocate={actions.relocate}
      onDescribe={actions.describe}
    />
  )
}

import { test, expect } from '@playwright/test'

/**
 * Visual regression for the gallery.
 *
 * The page is served a fixed set of photographs rather than whatever is in the
 * archive today, and every thumbnail is the same flat colour. That makes the
 * screenshot a test of the things this is actually meant to catch — the shell,
 * the rail, the date headings, and the justified row maths — and not a test of
 * which photographs happen to be newest.
 *
 * It used to run against live data, and the baseline went stale whenever
 * anything was imported. It broke three times in one afternoon: once because
 * the whole app was legitimately reskinned, once because a stale dev server was
 * painting an error overlay over the page, and once because a sidecar was
 * rewritten four minutes before the baseline was captured. Only the first was
 * worth knowing about, and the noise buried it.
 *
 * Sizes are deliberate: mixed aspect ratios across two days, so a change to the
 * row-packing maths moves pixels here.
 */

// 4:3, 3:4, 16:9 and square, so the justified rows have something to solve.
const SHAPES = [
  [1600, 1200], [1200, 1600], [1920, 1080], [1400, 1400],
  [1600, 1200], [1080, 1920], [1500, 1000], [1200, 1200],
]

const media = SHAPES.map(([width, height], i) => {
  const day = i < 4 ? 14 : 11
  return {
    path: `archive/2026/03/fixture-${i}.jpg`,
    filename: `fixture-${i}.jpg`,
    url: `/api/media/archive/2026/03/fixture-${i}.jpg`,
    thumbnail_url: `/api/thumb/fixture-${i}.jpg`,
    width,
    height,
    timestamp: `2026-03-${day}T1${i}:05:00`,
    is_video: false,
    dominant_color: '#8a8f98',
    city: i < 4 ? 'Haverhill' : 'Epping',
    state: 'NH',
    place_name: null,
    confidence: 'exact',
    duration: null,
    version: 1,
  }
})

// One mid-grey pixel, stretched by each tile. A real photograph would make the
// screenshot depend on JPEG decoding, which is not identical across machines,
// and grey shows the gaps between tiles where black would not.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGPo6p8BAANYAbKMazHIAAAAAElFTkSuQmCC',
  'base64',
)

const json = (route, body) => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
})

test('the gallery lays out as it should', async ({ page }) => {
  // The month counts come first: they build the year rail down the right and
  // decide which window of the archive to ask for. Mocked before the window
  // itself, because a catch-all on /api/gallery swallows this one too and the
  // page then has no months to show.
  await page.route('**/api/gallery/counts**', route => json(route, {
    bucket: 'month',
    buckets: [{ bucket: '2026-03', count: media.length }],
  }))

  await page.route(/\/api\/gallery(\?|$)/, (route, request) => json(route,
    // The undated drawer asks the same endpoint. Answering it with the fixture
    // would claim these eight photographs are both dated March and undated.
    new URL(request.url()).searchParams.get('undated') === 'true'
      ? { media: [], total: 0, offset: 0, has_more: false }
      : { media, total: media.length, offset: 0, has_more: false },
  ))

  // Nobody is favourited, so the hearts are all in the same state.
  await page.route('**/api/me/favorites/paths**', route => json(route, { paths: [] }))

  // Every image, whatever the path — thumbnails, full frames, avatars.
  // Thumbnails, full frames, and the avatar in the header.
  await page.route(/\.(jpg|jpeg|png|webp)(\?|$)/, route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: PIXEL,
  }))

  await page.goto('/')
  await expect(page.getByTestId('gallery-item').first()).toBeVisible({ timeout: 15_000 })
  // Every tile laid out, so the screenshot is not taken mid-pack.
  await expect(page.getByTestId('gallery-item')).toHaveCount(media.length)

  await expect(page).toHaveScreenshot('gallery-landing.png', {
    fullPage: false,
    animations: 'disabled',
    maxDiffPixelRatio: 0.02,
  })
})

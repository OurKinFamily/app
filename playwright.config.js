import { defineConfig, devices } from '@playwright/test'

// Read-only e2e tests against the local dev stack. The API at :8000 must
// already be running (api.sh). Playwright spawns the Vite dev server at
// :5173 itself, reusing an already-running instance when one is up.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  // List reporter for live terminal output, HTML for after-the-fact review.
  // `open: 'never'` so CI / local runs don't auto-launch a browser tab —
  // use `npm run e2e:report` to open it on demand.
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    timeout: 30_000,
  },
})

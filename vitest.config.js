import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Vitest config — kept separate from vite.config.js so the eslint plugin's
// lintCommand doesn't run during unit tests. Excludes the Playwright specs
// under tests/e2e/ since those expect Playwright's own runner. jsdom env +
// jest-dom matchers are loaded via tests/setup.js so component tests can
// render with @testing-library/react.
export default defineConfig({
  plugins: [react()],
  // Ensure JSX in .test.jsx files uses the automatic runtime so we don't
  // need an explicit `import React from 'react'` in every test file.
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    globals: false,
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // Coverage scope = the units we own and intend to unit-test. Pages
      // are excluded because their value comes from e2e (tests/e2e/**),
      // not from unit-rendering whole route trees.
      include: [
        'src/lib/**/*.{js,jsx}',
        'src/components/**/*.{js,jsx}',
      ],
      exclude: [
        'src/main.jsx',
        'src/pages/**',
        'src/**/*.test.{js,jsx}',
        'src/**/__tests__/**',
        // Leaflet-backed map components need a real canvas — jsdom can't
        // render them and mocking leaflet defeats the test. Covered by
        // e2e + visual regression instead.
        'src/components/MiniMap.jsx',
        'src/components/PhotoMap.jsx',
        'src/components/PhotoViewer.jsx',
      ],
      // Target: 100% across the included files. Falling below fails the
      // suite — coverage can't silently regress.
      thresholds: {
        statements: 100,
        branches:   100,
        functions:  100,
        lines:      100,
      },
    },
  },
})

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright-report', '.playwright-mcp', 'test-results']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'max-lines': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // Legacy components + pages: relax the rules we're migrating away from.
    // RootLayout + GalleryPage already follow the new patterns — keep them strict.
    // (Everything under src/components/new/** stays strict by default.)
    files: ['src/components/*.jsx', 'src/pages/*.jsx'],
    ignores: ['src/components/RootLayout.jsx', 'src/pages/GalleryPage.jsx'],
    rules: {
      'max-lines': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-refresh/only-export-components': 'off',
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-empty': 'off',
    },
  },
  {
    // Test files + test helpers + the vitest setup file use Node globals
    // (`global`, `process`, etc.) on top of the browser environment, and
    // are allowed to grow past the production max-lines cap.
    files: [
      '**/*.test.{js,jsx}',
      'tests/**/*.{js,jsx}',
    ],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      'max-lines': 'off',
    },
  },
  {
    // Config files run in Node, not the browser — `process`, `__dirname`,
    // etc. are valid.
    files: ['*.config.{js,jsx}', 'playwright.config.{js,jsx}', 'vite.config.{js,jsx}', 'vitest.config.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
])

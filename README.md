# ourkin / app

React frontend for the Ourkin family archive. Built with Vite, Tailwind CSS, and shadcn/ui.

## Running locally

```bash
npm install
npm run dev
```

App available at http://localhost:3000.

The dev server proxies `/api/*` to `http://localhost:8000` (see `vite.config.js`), so you need the API running locally too. See `../api/README.md`.

## Testing

```bash
npm test
```

Tests cover the API client functions in `src/lib/api.js` using mocked fetch.

## CI/CD

Push to `staging` → runs tests → builds `ghcr.io/ourkinfamily/app:staging` → deploys to staging.ourkin.family  
Push to `main` → runs tests → builds `ghcr.io/ourkinfamily/app:latest` → deploys to www.ourkin.family

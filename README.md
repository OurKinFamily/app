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

## CI/CD & Branch Flow

```
feature/* → PR → staging → PR → main
```

- PRs target `staging` by default
- Merging to `staging` → tests → builds `ghcr.io/ourkinfamily/app:staging` → deploys to staging.ourkin.family
- Merging to `main` → tests → builds `ghcr.io/ourkinfamily/app:latest` → deploys to www.ourkin.family
- PRs to `main` are blocked unless the source branch is `staging`

Both branches are protected — no direct pushes. `staging` allows admin bypass for emergencies.

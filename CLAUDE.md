# mykin — app

React frontend for the mykin family archive.

## Running

```bash
npm install
npm run dev       # dev server at http://localhost:3000
npm run build     # production build
```

## Stack

- Vite + React
- Tailwind CSS
- shadcn/ui (components added as needed)

## Structure

```
src/
  lib/api.js          # all API calls — talks to /api proxy → FastAPI
  components/         # shared UI components
  pages/              # one file per page/route
  App.jsx             # root, routing lives here when added
  index.css           # Tailwind import + base styles
```

## API

All requests go through the Vite dev proxy at `/api` → `http://localhost:8000`.
No hardcoded URLs in components — everything through `src/lib/api.js`.

## Current Pages

- `PeoplePage` — lists all people, click to see relatives panel

## Coming Next

- Routing (React Router)
- Person detail page with family tree tab
- Create / edit person

# BuildPro Frontend

React 19 + TypeScript + Vite frontend for the BuildPro construction management platform.

## Development

```powershell
npm install
npm run dev
```

Opens at http://localhost:5173. Requires the backend running at http://localhost:8000.

## Build & Lint

```powershell
npm run build
npm run lint
```

## Structure

```
src/
  api/          # Axios client with CSRF handling
  components/   # Shared UI components (17 components)
  hooks/        # TanStack Query hooks for all API endpoints
  pages/        # Page components (6 global + 23 project workspace)
  stores/       # Zustand UI state
  styles/       # Tailwind CSS + theme tokens
  types/        # Shared TypeScript types
  lib/          # Utility functions
```

## Key Dependencies

- React 19 + React Router
- TanStack Query (server state)
- Zustand (UI state)
- Tailwind CSS 4.x
- Vite (build tooling)

## Production Build

The frontend Dockerfile builds the SPA with Node and serves it with Nginx.
See `deploy/docker-compose.prod.yml` for production deployment.

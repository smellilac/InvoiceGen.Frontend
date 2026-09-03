# Development

How to run this app locally, together with the backend.

## Prerequisites

- Node.js — Angular 22 dropped support for Node 20, so use a current LTS
  release. Check `@angular/cli`'s peer requirement at scaffold time
  (`ng version`) since the exact minimum can shift between minor releases.
- npm (this repo's package manager — see `decisionslog.md` for why not
  pnpm/yarn).
- The backend (`invoiceapp`) checked out separately and runnable via
  `dotnet run`.

## Running both together

1. Start the backend first:
   ```
   cd ../invoiceapp
   dotnet run
   ```
   By convention in this project, it serves on `https://localhost:7201`.

2. Confirm the backend's CORS configuration allows this app's dev origin
   (`http://localhost:4200` — Angular's default `ng serve` port). If it
   doesn't, requests will fail in the browser console with a CORS error,
   not a clear "wrong origin" message — check this first if API calls
   silently fail only from the browser (and work fine from something like
   `curl` or Postman).

3. Install dependencies and start the frontend:
   ```
   npm install
   npm start   # ng serve
   ```
   The app reads the backend's base URL from `src/environments/`
   (`environment.development.ts` for local dev) — set it to
   `https://localhost:7201` there, not hardcoded elsewhere.

## Regenerating API types

Whenever the backend's `docs/openapi.yaml` changes (version bump), pull the
updated file and regenerate — see `api-client.md` for the exact command.
Do this before relying on any new/changed field; don't hand-edit the
generated output to "get ahead" of a regeneration.

## Building

```
npm run build
```

Production build output and deployment target aren't decided yet — this
project is still in local-development-only stage. Revisit this section
once hosting/deployment is decided (see the backend's own deployment
discussion, also still open).

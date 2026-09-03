# Invoice App — Frontend

## What this is

The Angular frontend for the Invoice App: users log in, pick a document
type, fill out a form, and download or email a PDF. Consumes the backend
API described in `invoiceapp`'s `docs/openapi.yaml` — this repo has no
business logic of its own beyond form handling and rendering; the backend
is the source of truth for money math, rounding, and validation.

**Status: Planning complete, implementation starting.** Steps 1–2 of the
build plan are done (project scaffolding + generated API types); this repo
was created at that point. Update this file and `docs/` as real
implementation choices land — don't let them go stale once code exists,
same rule the backend repo follows.

## Tech stack

- Framework: **Angular 22** (standalone components, OnPush by default,
  `httpResource` for data fetching)
- UI components: **Angular Material**
- Forms: **Reactive Forms** (`FormGroup`/`FormArray`) — not Signal Forms.
  See `docs/decisionslog.md` for why.
- State management: plain per-feature services holding signals, plus
  `httpResource` for paginated lists. No NgRx — see `docs/decisionslog.md`.
- API types: generated from the backend's `openapi.yaml`, not hand-written.
  See `docs/api-client.md`.
- Auth: JWT access + refresh pair issued by the backend. Access token kept
  in memory, refresh token in `localStorage`. See `docs/authentication.md`.
- Package manager: **npm**.

Fill these in as they change; don't let an assumption sit undocumented.

## Non-negotiable conventions

See `docs/conventions.md` for the full list and reasoning. The short version:
standalone components only, Reactive Forms only (no Signal Forms yet),
monetary amounts are always rendered through the shared currency pipe (never
formatted ad hoc), and API calls always go through the generated client —
never a hand-typed `fetch`/`HttpClient` call with guessed response shapes.

## Where to look

| Doc | Covers |
|---|---|
| `docs/architecture.md` | Routing map, folder layout, and how a request flows end to end (auth, document creation, sending) |
| `docs/api-client.md` | How API types are generated from `openapi.yaml`, and how each feature service uses them |
| `docs/authentication.md` | Token storage, the auth interceptor, the route guard, login/logout/refresh flow |
| `docs/conventions.md` | Coding conventions specific to this repo |
| `docs/decisionslog.md` | Why things are the way they are — stack choices, token storage, forms library. Read this before "fixing" something that looks odd |
| `docs/development.md` | How to run the app and the backend together locally |

This repo is separate from the backend (`invoiceapp`) — separate folder,
separate Git history, own `package.json`. It only ever talks to the backend
over HTTP, through the generated API client.

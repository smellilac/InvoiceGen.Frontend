# Invoice App — Frontend

## What this is

The Angular frontend for the Invoice App: users log in, pick a document
type, fill out a form, and download or email a PDF. Consumes the backend
API described in `invoiceapp`'s `docs/openapi.yaml` — this repo has no
business logic of its own beyond form handling and rendering; the backend
is the source of truth for money math, rounding, and validation.

**Status: Actively built out — the core product is implemented and
working.** What exists today (verify against the code before trusting this
list — keep it honest):

- **Auth** — register, login, logout, JWT access/refresh with an HTTP
  interceptor and a route guard on the protected subtree
  (`core/auth.*`, `features/auth/`).
- **Profile / business settings** (`/profile`) — edit the fields that
  pre-fill new documents (business name/address, default currency) and
  upload/remove a logo, via `GET`/`PATCH /auth/me` and the logo endpoints.
- **Account deletion** — "Delete my account" with a typed-confirmation
  dialog, hitting `DELETE /auth/me` (`features/profile/`).
- **Documents** — the full lifecycle across 12 document types: a type
  picker (`/`), a create form (`documents/new`), a paginated history list
  filterable by type and by customer (`/documents`), and a detail view
  (`/documents/:id`) that recomputes nothing — it renders backend values
  and offers **Download PDF**, **email Send** (with post-send status
  polling of `last_send_status`/`last_send_error`), **Delete**, and
  **Record settlement** (payment/refund), plus type-aware overdue badges.
- **Customers** — full CRUD: list, detail, create, edit, delete
  (`features/customers/`).
- **Guest / unauthenticated generation** — signed-out visitors can fill
  the create form and download a PDF via `POST /documents/guest` (nothing
  saved), gated by a soft client-side free-document limit that then shows a
  sign-up prompt (`features/documents/guest-attempts.service.ts`).
- **Informational pages** — a hand-authored **Terms of Service** (`/terms`)
  and **Help** (`/help`) page with real content, plus a **Privacy Policy**
  (`/privacy`) that is still a "coming soon" placeholder. All three are
  public, linked from the footer.

Update this file and `docs/` as real implementation choices land — don't
let them go stale once code exists, same rule the backend repo follows.

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

# Architecture

High-level shape of the app: routes, folders, and how the main flows
(login, creating a document, sending it) move through the pieces.

## Folder layout

```
src/app/
  core/         — app-wide singletons: AuthService, the auth HTTP
                  interceptor, authGuard, api base config
  features/
    auth/         — login, register components
    documents/    — list, create form, detail view + DocumentService
    customers/    — list, create/edit form + CustomerService
    profile/      — business profile page (PATCH /auth/me)
  shared/       — reusable, feature-agnostic pieces: the currency-correct
                  money pipe, a snackbar/alert helper
```

Each `features/*` folder owns its own routes, components, and a service
that wraps the generated API client for that resource (see
`api-client.md`). Nothing outside `core/` and `shared/` is imported across
feature folders — if two features need the same thing, it belongs in
`shared/`.

## Routes

| Path | Access | Purpose |
|---|---|---|
| `/login` | public | `POST /auth/login` |
| `/register` | public | `POST /auth/register` |
| `/help`, `/terms`, `/privacy` | public | Static informational pages (footer links) |
| `/` | public | Document type picker — `GET /document-types` |
| `/documents/new` | public | Create form. Signed in: `POST /documents`, saved, then detail page. Guest: `POST /documents/guest`, PDF downloaded, nothing saved. Accepts `?type=` and (signed in only) `?customerId=` / `?duplicateFrom=` |
| `/documents` | protected | Paginated history — `GET /documents`, filterable by `type` / `customer_id` |
| `/documents/:id` | protected | Detail: summary, Download PDF, Send Email |
| `/search` | protected | Natural-language document search — `POST /api/search`, filterable by status / amount range / date range. Results are cards (id, score, snippet) linking to `/documents/:id` |
| `/customers` | protected | Paginated list — `/customers*` |
| `/customers/new` | protected | Create form — `POST /customers` |
| `/customers/:id` | protected | Read-only detail + document history (`GET /documents?customer_id=`); "Create document for this customer" opens the picker with `?customerId=` |
| `/customers/:id/edit` | protected | Edit form — `PATCH`/`DELETE /customers/{id}` |
| `/profile` | protected | Business profile — `GET`/`PATCH /auth/me` |

The protected routes sit behind `authGuard` (see `authentication.md`),
declared once on a componentless empty-path group nested inside the public
`MainLayout` shell. The picker (`/`) and the creation form (`/documents/new`)
are deliberately **public** — the "try before you sign up" guest flow (see
below and `decisionslog.md`). `MainLayout` adapts its header to auth state:
the full nav + Log out when signed in, Log in / Sign up when not.

## Guest document flow

A signed-out visitor can create documents before registering, capped by a
soft client-side limit (`GuestAttemptsService`, `localStorage`, default
`GUEST_FREE_DOCUMENT_LIMIT` = 3 — a nudge, not a security boundary).

1. The picker and creation form render for guests. The form omits the
   saved-customer picker and the logo toggle (both authenticated-only), shows
   a sign-up nudge in the customer picker's place, and makes `from` required
   (no saved profile to fall back on). A compact promo banner sits above it.
2. On submit, a guest calls `POST /documents/guest` (`createGuestDocument`),
   which returns the rendered PDF directly (`200 application/pdf`, nothing
   persisted). The client triggers an immediate browser download — there's no
   detail page to visit — then decrements the attempt count (only on success:
   a `422` the user fixes doesn't burn an attempt) and shows a confirmation
   with the remaining count.
3. Once the free documents are used up, the form is replaced by a sign-up
   gate (fuller benefit copy + a CTA to `/register`).

Everything account-linked — history, detail, Customers, profile — stays
behind `authGuard`, so a guest hitting one is redirected to `/login`.

## Auth flow (summary — full detail in `authentication.md`)

1. On login/register, the backend returns an access + refresh token pair.
   The access token is kept in memory (an `AuthService` signal); the
   refresh token is written to `localStorage`.
2. An HTTP interceptor attaches `Authorization: Bearer <access_token>` to
   every request except the four public endpoints (`/auth/register`,
   `/auth/login`, `/auth/refresh`, `/document-types`).
3. On a `401`, the interceptor calls `POST /auth/refresh` once, retries the
   original request on success, and clears state + redirects to `/login`
   on failure.
4. On app bootstrap, if a refresh token exists in `localStorage` but there's
   no access token in memory (a fresh page load), the app silently calls
   `/auth/refresh` once before rendering protected routes — so an in-memory
   access token doesn't force a re-login on every reload.

## Document create → send flow

1. `/documents/new` builds a `CreateDocumentRequest` via a Reactive Form
   (a `FormArray` for line items) and posts it — `201` returns the full
   `Document`, including the server-computed `subtotal`/`total`/tax
   (never recomputed client-side; the backend is the source of truth for
   money math — see the backend's `x-rounding-policy`).
2. `/documents/:id` shows that `Document`, with a Download PDF link
   (`GET /documents/{id}/pdf`) and a Send button.
3. Send calls `POST /documents/{id}/send`, which returns `202` — not a
   confirmation of delivery (see the backend's `x-email-delivery-policy`).
   The detail view re-fetches the document a few seconds later to pick up
   `last_send_status`; a `failed` status triggers a `MatSnackBar` alert
   showing `last_send_error`.

## Money rendering

Every place an amount is shown goes through the shared currency pipe
(`shared/currency.pipe.ts`), which formats using the *document's own*
`currency` field via `Intl.NumberFormat`, never a fixed locale — this
mirrors the backend's `x-rendering-policy.currency_correct_number_formatting`
and must stay consistent with it, or the frontend and the PDF would show a
USD document differently.

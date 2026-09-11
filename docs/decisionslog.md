# Decisions Log

Why things are the way they are. Read this before "fixing" something that
looks like an odd choice — it might be deliberate.

## Framework: Angular (over Blazor / React)

Considered Blazor, which would have meant staying entirely in C# — the
path of least resistance given the backend is ASP.NET Core. Chose Angular
instead because part of the goal here is deliberately learning
frontend tooling, not just shipping the fastest way possible. Angular's
class-based, dependency-injection-driven structure is also closer to
ASP.NET Core's own patterns than React's function-heavy style, which makes
it a reasonable first frontend framework coming from a C#/.NET background.

## UI components: Angular Material (over Tailwind / plain CSS)

Chosen over Tailwind (full design control, but every component — table,
alert, dialog — has to be built from scratch) and plain CSS (most manual
work). Angular Material gives ready components for exactly what this app
needs: a paginated table for the documents/customers lists (matching the
backend's `page`/`per_page`/`total` list shape directly), `MatSnackBar` for
the "email failed to send" alert, and confirm dialogs for delete actions.
It also matches Angular's own batteries-included philosophy, which keeps
the number of third-party choices down for a first Angular project.

## Forms: Reactive Forms (over Signal Forms)

Angular 22 stabilized Signal Forms the same month this project started
its frontend. Signal Forms are a good conceptual fit for the dynamic
line-items form, but being brand-new means there's much less tutorial and
StackOverflow content available if something goes wrong. Reactive Forms
(`FormGroup`/`FormArray`) are chosen instead specifically because this is a
learning project — more available reference material outweighs using the
newest API. Revisit this once Signal Forms have more community material,
or once there's a concrete reason Reactive Forms can't do what's needed.

## Token storage: access token in memory, refresh token in `localStorage`

Three options were considered:
- Both tokens in `localStorage` — simplest, but both are exposed to any
  script running on the page if the app ever has an XSS bug.
- Both tokens in memory only — smallest exposure window, but logs the user
  out on every page refresh, which is a real UX cost with no backend
  change (like an httpOnly refresh cookie) to offset it, since the backend
  returns `refresh_token` in the JSON body per the spec, not a cookie.
- **Chosen: access token in memory, refresh token in `localStorage`.**
  The access token is short-lived (900s) and never touches persisted
  storage; the refresh token persists so a reload doesn't force a
  re-login. See `authentication.md` for the resulting interceptor/bootstrap
  logic this requires.

## State management: no NgRx

The app's data needs — a handful of paginated lists, one authenticated
user, one in-progress form — don't warrant NgRx's ceremony at this size.
Per-feature services holding signals, plus `httpResource` for the list
screens, cover everything Phase 1 needs. Revisit only if a real
cross-feature state need shows up that a shared service genuinely can't
express cleanly.

## API types: generated from `openapi.yaml`, not hand-written

Hand-writing TypeScript interfaces for the API risks silent drift from the
actual contract, especially since the backend spec has already gone
through several versions (currently 0.8.0) with real field renames
(`amount_paid`/`balance_due` → `amount_settled`/`balance_remaining` in
0.6.0, for one). Generating types directly from the spec means a spec
change surfaces as a compile error in the frontend instead of a silent
runtime mismatch. See `api-client.md` for the generation command.

## Accounts required for every document (no anonymous flow) — SUPERSEDED

**Superseded:** a guest "try before you sign up" flow now exists (see the
next entry). This original reasoning is kept for context.

Considered whether requiring login before generating even one document
creates too much friction, compared to invoice-generator.com's model
(generate first, no account needed). Decided against changing this:
accounts-first was the backend's stated Phase 1 goal from the very start
(not an afterthought), and nearly everything the app does — saved history,
saved customers, the business profile — inherently requires a real user to
belong to. Registration itself is already lightweight (email + password,
no verification step), which reduces how much friction this decision
actually adds. An anonymous "try without an account" flow is a real
possible future feature, but a deliberate one to add later with evidence
it's needed, not a default to build in now.

## Guest document flow (try before you sign up)

The anonymous flow flagged as "a possible future feature" above is now
built, on the back of the backend's `POST /documents/guest`
(`security: []`, added in `openapi.yaml` 0.13.0). A signed-out visitor can
reach the document type picker and the creation form and generate real
PDFs without an account; the response is the rendered PDF streamed straight
back (nothing is persisted — no history, no `id`), so the client triggers
an immediate download rather than navigating to a detail page.

Everything account-linked stays behind the auth guard exactly as before —
history, document detail, all of Customers, the profile. The guest form
therefore omits the saved-customer picker and the logo toggle (both are
authenticated-only resources) and makes `from` required, since there's no
saved business profile to fall back on.

The number of free guest documents is a **soft, client-side limit**
(`GuestAttemptsService`, `localStorage`, default `GUEST_FREE_DOCUMENT_LIMIT`
= 3), deliberately *not* a security boundary: it's a gentle nudge toward
signing up, and a cleared `localStorage` simply resets it. The real
resource protection is the auth guard on everything that matters; the guest
endpoint itself intentionally persists nothing, so there's nothing to
abuse. Enforcing a hard per-visitor cap would need backend state we
deliberately don't keep for guests.

## Package manager: npm

No strong reason to reach for pnpm or yarn on a solo project — npm ships
with Node and is one less tool to install and keep updated.

## Repo: separate from the backend

A monorepo (single repo, `/backend` + `/frontend` folders) was also a
reasonable option. Chose a separate repo (`invoiceapp-frontend`) instead —
either works for a solo project, this just keeps the two deploy
lifecycles (frontend static hosting vs. backend API hosting) from being
tangled together later.

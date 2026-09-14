# Authentication

How login, token storage, and route protection work. See
`decisionslog.md` for *why* tokens are stored this way.

## Token storage

- **Access token** — held in memory only, as a signal on `AuthService`
  (e.g. `accessToken = signal<string | null>(null)`). Never written to
  `localStorage`/`sessionStorage`/cookies. It's short-lived (`expires_in`
  on `AuthResponse`, currently 900s per the backend), so the exposure
  window from keeping it unpersisted is small.
- **Refresh token** — written to `localStorage` on login/register/refresh,
  and cleared on logout or on a failed refresh. This is what survives a
  page reload — without it, every reload would force a re-login.

## `AuthService` surface

- `login(email, password)` / `register(...)` — call the backend, store
  both tokens (access in the signal, refresh in `localStorage`), store the
  returned `User`.
- `googleSignIn(idToken)` — "Continue with Google". Posts the Google ID
  token (a JWT obtained client-side from Google Identity Services) to
  `POST /auth/google`, which returns the same `AuthResponse` as login;
  stores the tokens/user via the exact same path `login()` uses. See
  `docs/google-sign-in.md`.
- `logout()` — calls `POST /auth/logout` with the current refresh token
  (revokes it server-side), then clears the in-memory access token and
  removes the refresh token from `localStorage`, regardless of whether the
  server call succeeds (a failed logout call shouldn't leave the user
  stuck "logged in" client-side).
- `refresh()` — calls `POST /auth/refresh` with the stored refresh token,
  updates both tokens on success, clears everything on failure.
- `isAuthenticated` — a computed signal, true when there's an access token.

## HTTP interceptor

Applies to every outgoing request:

1. If the request URL is one of the public endpoints (`/auth/register`,
   `/auth/login`, `/auth/google`, `/auth/refresh`, `/document-types`, and
   `/documents/guest` — the unauthenticated guest document flow), pass it
   through unchanged: no bearer token attached, and no refresh-on-401 retry.
   A guest or `/auth/google` request can't 401 for *our* auth reasons (it
   carries a Google ID token, not our access token), so it must never drag
   the refresh machinery in.
2. Otherwise, attach `Authorization: Bearer <access_token>` from
   `AuthService`.
3. If the response is `401`, call `AuthService.refresh()` once. On
   success, retry the original request with the new access token. On
   failure, call `AuthService.logout()` locally (no point calling the
   backend logout endpoint with a refresh token that just failed) and
   redirect to `/login`.
4. Only retry once per request — a second `401` after a successful-looking
   refresh means something else is wrong (e.g. the account was deleted
   mid-session), and should fall through to the logout/redirect path
   rather than looping.

## Route guard

`authGuard` checks `AuthService.isAuthenticated`. If false, it redirects to
`/login`, preserving the attempted URL so the user lands back where they
meant to go after logging in.

## Bootstrap (app startup / page reload)

Because the access token lives only in memory, a fresh page load always
starts with `isAuthenticated === false`, even for a user with a valid
refresh token sitting in `localStorage`. Before the router activates any
guarded route, an app initializer checks: if a refresh token exists but
there's no access token, call `AuthService.refresh()` once and wait for it
before proceeding. This makes the reload invisible to the user in the
normal case, and falls through to `/login` if the stored refresh token
turns out to be expired or revoked.

## What this does *not* handle yet

The backend's account lockout (5 failed attempts → 5-minute lockout)
currently surfaces as a plain `401` on `/auth/login`, indistinguishable
from a wrong password (see the backend's `x-security-policy`). The login
form can't yet show "Account locked, try again in 5 minutes" specifically
— it'll show the same generic "Incorrect email or password" message
either way, until the backend adds a distinguishable status
(`423 Locked`, noted as a future backend change in the spec).

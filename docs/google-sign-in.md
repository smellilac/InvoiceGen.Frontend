# Continue with Google

A second way to authenticate, offered alongside — never replacing — the
email/password form on both `/login` and `/register`. Additive: it reuses
the existing token storage, interceptor, and post-login navigation.

## Flow

1. The Google Identity Services (GSI) script is loaded once, in
   `src/index.html` (`https://accounts.google.com/gsi/client`, `async defer`).
2. `shared/google-sign-in-button.ts` waits for the global `google.accounts.id`
   to be ready, then `initialize(...)` + `renderButton(...)` to draw Google's
   own button. The button text is "Continue with Google".
3. Google invokes the callback with a credential (an **ID token** JWT). The
   component posts it to `POST /auth/google` via `AuthService.googleSignIn`,
   which stores the returned access/refresh pair and user through the **exact
   same path** `login()` uses (`applyAuthResponse`) — no duplicated
   token-storage logic.
4. On success the component emits `(success)`; the host page navigates to the
   same destination as a normal login (`/login` honours `returnUrl`;
   `/register` goes to `/`).
5. On any failure — a token Google/our backend rejects, a network error, or
   the GSI script never loading — the user sees a snackbar
   ("Google sign-in failed, please try again or use email/password"). Never a
   native `alert()`. A cancelled/closed Google prompt simply does nothing and
   leaves the page fully usable on email/password.

## Account matching (backend)

`POST /auth/google` verifies the ID token server-side and matches by verified
email: an existing Google account logs in, an existing password account is
auto-linked and logs in (no duplicate account), and an unknown email creates a
new password-less account. See `x-google-auth-policy` in the backend spec.

## Password login of a Google-only account

An account created via Google has no password. If someone tries the
email/password form with that email, `POST /auth/login` returns **409**
(`account_uses_google_auth`), distinct from the generic 401. The login page
detects the 409 and shows an inline message steering the user to the
"Continue with Google" button instead of a wrong-password error.

## Client ID / configuration

The OAuth client ID lives in `src/environments/environment.ts` (dev) and
`src/environments/environment.prod.ts` (prod), as `environment.googleClientId`,
clearly marked as the value to swap per environment. The production build
swaps the file via `fileReplacements` in `angular.json`. Each deployment's
OAuth client must list that origin under its authorized JavaScript origins, or
GSI refuses to render the button.

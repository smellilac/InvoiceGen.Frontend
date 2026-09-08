# API Client

How this app talks to the backend, and how it stays in sync with
`invoiceapp`'s `docs/openapi.yaml` instead of drifting from it.

## Generating types from the spec

Request/response types are **generated, not hand-written**, from the
backend's `openapi.yaml` (currently v0.10.0). Use `ng-openapi-gen` (or
`openapi-typescript` if you'd rather generate plain types and write your
own thin HTTP wrappers):

```
npx ng-openapi-gen --input ../invoiceapp/docs/openapi.yaml --output src/app/core/api-client
```

Re-run this any time the backend's `openapi.yaml` version bumps — don't
patch the generated files by hand, since the next regeneration would
silently overwrite the fix. If the generated shape is wrong for some
reason, the fix belongs in the spec or in a wrapper service, never in the
generated output.

The generated client's base URL is read from `environment.ts` /
`environment.development.ts` (see `development.md`) — `https://localhost:7201`
in local development.

## Feature services wrap the generated client

Each `features/*` folder has one service that wraps the generated client
calls relevant to it, so components never call the generated client
directly:

| Service | Wraps |
|---|---|
| `AuthService` | `/auth/*` — see `authentication.md` for the token-handling logic layered on top |
| `DocumentService` | `/document-types`, `/documents*` |
| `CustomerService` | `/customers*` |

This indirection is what makes `httpResource` usable cleanly for lists
(`DocumentService.list(params)` returns an `httpResource`-wrapped call
that components bind to directly) and gives one place to adjust if a
generated method's shape ever needs adapting.

## Error handling

- **`401`** — never handled per-call. The auth interceptor handles this
  globally (refresh-then-retry, or redirect to `/login`). Feature code
  should never need to catch a 401 itself.
- **`422` (`ValidationErrorResponse`)** — the `error.fields` array maps
  directly onto form control names (e.g. `items[0].unit_cost`). Forms
  should walk this array and call `setErrors()` on the matching control,
  rather than showing a single generic error banner.
- **`429`** — show a "Too many requests, try again shortly" message rather
  than treating it like a generic failure; this can legitimately happen on
  `/auth/*` and on `POST /documents/{id}/send` (both rate-limited per the
  spec's `x-security-policy`/`x-email-delivery-policy`).
- **`202` on `POST /documents/{id}/send`** — not success in the "it was
  delivered" sense, just "it was queued." Don't show a "Sent!" confirmation
  from this response alone — see the send flow in `architecture.md`.
- **Everything else (`404`, `409`, network failure)** — a generic error
  toast via the shared snackbar helper is fine; these aren't common enough
  in normal use to need special-casing per endpoint.

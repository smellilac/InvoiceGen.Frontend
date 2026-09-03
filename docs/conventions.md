# Conventions

Coding conventions specific to this repo. See `decisionslog.md` for the
reasoning behind the ones that were a real choice, not just a default.

- **Standalone components only.** No `NgModule`s — this is the default
  project shape in Angular 22 and there's no reason to deviate from it.
- **OnPush is the default change detection strategy** in Angular 22 (the
  old default is now called `Eager`). Don't override it back to `Eager` on
  a component unless you have a specific, documented reason — it usually
  means a signal/input isn't being used correctly instead.
- **Reactive Forms only — not Signal Forms.** Angular 22 stabilized Signal
  Forms, but this repo standardizes on `FormGroup`/`FormArray` for now.
  See `decisionslog.md`. Don't mix the two approaches in the same feature.
- **API calls always go through the generated client**, wrapped by a
  feature service (see `api-client.md`). Never call `HttpClient` directly
  from a component, and never hand-type a request/response interface that
  duplicates something the generator already produces.
- **Monetary amounts always render through the shared currency pipe**
  (`shared/currency.pipe.ts`). Never call `.toFixed(2)` or build a `$`
  string manually — that bypasses the currency-correct formatting the
  backend's `x-rendering-policy` requires, and the frontend must stay
  consistent with the PDF output.
- **Lists use `httpResource`**, not a manually-managed `subscribe()` +
  component field. This covers loading/error state and refetching without
  hand-rolled RxJS bookkeeping — see `architecture.md`.
- **No NgRx.** Feature-local services holding signals are the state layer.
  If a future feature genuinely needs cross-feature shared state beyond
  what a shared service can hold, revisit this — don't reach for it by
  default.
- **Folder-per-feature.** A feature's components, its service, and its
  routes live together under `features/<name>/`. Nothing outside
  `core/`/`shared/` is imported by more than one feature — shared code
  moves to `shared/` instead of being imported cross-feature.
- **TypeScript strict mode on.** The generated API types are only useful
  if the rest of the codebase is equally strict — no `any` as an escape
  hatch for a type the generator already gives you correctly.

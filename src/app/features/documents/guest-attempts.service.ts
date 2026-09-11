import { Injectable, computed, signal } from '@angular/core';

/**
 * How many guest documents an unauthenticated visitor may generate in one
 * browser before the create form is replaced by the sign-up gate. Deliberately a
 * single named constant so it's trivial to tune later (see the guest flow in
 * docs/architecture.md). This is a soft, client-side nudge — not a security
 * boundary — so it lives in `localStorage` and is intentionally not defended
 * against the user clearing it.
 */
export const GUEST_FREE_DOCUMENT_LIMIT = 3;

/** localStorage key holding the count of successfully generated guest documents. */
const GUEST_ATTEMPTS_KEY = 'invoiceapp.guest_documents_used';

/**
 * Tracks how many guest documents have been successfully generated in this
 * browser, against {@link GUEST_FREE_DOCUMENT_LIMIT}. Only a *successful* guest
 * generation counts (a 422 the user then fixes must not burn an attempt — see
 * `DocumentCreate.submitGuest`), so the count is bumped explicitly via
 * {@link recordSuccess}, never on mere form submission.
 *
 * Purely a UX limit: it gently steers repeat guests toward signing up. It is not
 * relied on for anything security-sensitive, so a cleared `localStorage` simply
 * resets the count and that's fine (see docs/decisionslog.md's guest rationale).
 */
@Injectable({ providedIn: 'root' })
export class GuestAttemptsService {
  /** Number of guest documents generated so far in this browser. */
  private readonly used = signal(readStoredCount());

  /** How many free guest documents remain (never negative). */
  readonly remaining = computed(() => Math.max(0, GUEST_FREE_DOCUMENT_LIMIT - this.used()));

  /** True while the visitor still has at least one free guest document left. */
  readonly hasRemaining = computed(() => this.remaining() > 0);

  /**
   * Record one successfully generated guest document, decrementing the remaining
   * count and persisting it. Call this only after the PDF has actually come back
   * and downloaded — never on submit, so a validation failure the user corrects
   * doesn't cost them an attempt.
   */
  recordSuccess(): void {
    const next = this.used() + 1;
    this.used.set(next);
    try {
      localStorage.setItem(GUEST_ATTEMPTS_KEY, String(next));
    } catch {
      // Best-effort persistence: if storage is unavailable the in-memory signal
      // still enforces the limit for this session, which is all a soft nudge needs.
    }
  }
}

/**
 * Read the persisted count, tolerating a missing/garbage value (clamped to a
 * non-negative integer). A soft limit never throws over bad storage — it just
 * treats it as "no attempts used yet".
 */
function readStoredCount(): number {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(GUEST_ATTEMPTS_KEY);
  } catch {
    return 0;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.floor(parsed);
}

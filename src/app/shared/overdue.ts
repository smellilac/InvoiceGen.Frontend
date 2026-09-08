import { Document } from '../api/models/document';

/**
 * Whether a {@link Document} is past due: it has a `due_date` strictly before
 * today AND a positive `balance_remaining`. Pure and stateless — computed
 * entirely from fields already on the document, no backend call (see the
 * overdue-indicator feature and docs/architecture.md).
 *
 * `due_date` is a date, not a datetime, so the comparison is date-only:
 * time-of-day is ignored and "today" is the local calendar day. A document due
 * *today* is not yet overdue; only a strictly-earlier due date counts.
 *
 * `balance_remaining` is the same shared field across all 12 document types but
 * its direction depends on `type` (see the backend's `x-settlement-policy`):
 * for most types it's what the customer still owes you, for `credit_note` it's
 * the credit you still owe back to them. The > 0 test is identical either way —
 * a fully settled document (`balance_remaining` 0) is never overdue regardless
 * of its due date. Only the badge *wording* differs; see {@link overdueLabel}.
 *
 * @param now Injectable clock, for testing; defaults to the current time.
 */
export function isOverdue(document: Document, now: Date = new Date()): boolean {
  const dueDate = document.due_date;
  if (!dueDate) {
    return false;
  }

  const balance = document.balance_remaining;
  if (balance == null || balance <= 0) {
    return false;
  }

  // Both sides are `YYYY-MM-DD` (we slice off any stray time component), and ISO
  // date strings sort lexicographically in chronological order — so a plain
  // string compare is a correct, timezone-safe date-only comparison.
  return dueDate.slice(0, 10) < toLocalIsoDate(now);
}

/**
 * Badge copy for an overdue document. Generic "Overdue" for money-owed-to-you
 * types; "Refund overdue" for `credit_note`, where `balance_remaining` is a
 * refund *you* owe the customer, not money they owe you — keeping the
 * settlement-direction distinction visible rather than collapsing it.
 */
export function overdueLabel(document: Document): string {
  return document.type === 'credit_note' ? 'Refund overdue' : 'Overdue';
}

/** Local calendar day as `YYYY-MM-DD` (not UTC — matches the user's "today"). */
function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

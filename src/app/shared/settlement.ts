import { DocumentType } from '../api/models/document-type';

/**
 * Type-aware wording for recording a settlement, mirroring the same
 * direction-dependent distinction the overdue badge makes (see `overdue.ts`
 * and the backend's `x-settlement-policy`): for `credit_note` the money flows
 * *out* to the customer, so it's a refund; for every other type money comes
 * *in*, so it's a payment. Kept in one place so the button label, the dialog
 * title, and the helper text can never drift from one another.
 */

/** Verb-phrase for the control/dialog title, e.g. "Record payment". */
export function settlementActionLabel(type: DocumentType | undefined): string {
  return type === 'credit_note' ? 'Record refund' : 'Record payment';
}

/** Bare noun for inline copy, e.g. "payment" / "refund". */
export function settlementNoun(type: DocumentType | undefined): string {
  return type === 'credit_note' ? 'refund' : 'payment';
}

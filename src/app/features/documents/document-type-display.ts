import { DocumentType } from '../../api/models/document-type';
import { DocumentTypeInfo } from '../../api/models/document-type-info';

/**
 * Shared type-display helpers for the documents feature. The picker and the
 * history list both need to render a document type as an icon + label, so the
 * mapping lives here rather than being duplicated in each component.
 *
 * The backend's `DocumentTypeInfo.icon` (and a `DocumentType` enum value) is a
 * plain identifier (e.g. "invoice"), not a Material Symbols name, so it can't go
 * straight into `<mat-icon>`. This maps each of the 12 type identifiers to a
 * real Material Symbols icon.
 */
const ICON_BY_IDENTIFIER: Record<string, string> = {
  invoice: 'edit_document',
  receipt: 'receipt_long',
  credit_note: 'restore',
  quote: 'edit_note',
  estimate: 'calculate',
  proforma_invoice: 'info',
  purchase_order: 'shopping_cart',
  sales_order: 'send',
  statement: 'bar_chart',
  timesheet: 'schedule',
  work_order: 'build',
  packing_slip: 'inventory_2',
};

/** Shown when the backend sends an icon identifier we don't have a mapping for. */
const FALLBACK_ICON = 'description';

/**
 * Resolves a backend type/icon identifier to a Material Symbols icon name.
 * Accepts either a `DocumentTypeInfo.icon` (from `/document-types`) or a
 * `DocumentType` enum value (from a `Document`) — both are the same identifier.
 */
export function documentTypeIcon(identifier: string | null | undefined): string {
  return (identifier && ICON_BY_IDENTIFIER[identifier]) || FALLBACK_ICON;
}

/**
 * Card copy for each document type on the picker. These blurbs are UI-authored
 * marketing text, not backend data, so they live here rather than coming from
 * `DocumentTypeInfo.description` (which may be terse or absent). Keyed by the
 * `DocumentType` id.
 */
const DESCRIPTION_BY_IDENTIFIER: Record<string, string> = {
  invoice: 'Create and send professional invoices to your customers.',
  receipt: 'Generate receipts for payments received.',
  credit_note: 'Issue a credit note for returns or adjustments.',
  quote: 'Create a quote and share it with your customer.',
  estimate: 'Prepare an estimate for upcoming work or services.',
  proforma_invoice: 'Generate a proforma invoice for preliminary billing.',
  purchase_order: 'Create a purchase order for your suppliers.',
  sales_order: 'Create a sales order for confirmed purchases.',
  statement: 'Generate an account statement for your customer.',
  timesheet: 'Track and record time for your projects.',
  work_order: 'Create a work order for tasks and services.',
  packing_slip: 'Generate a packing slip for shipped items.',
};

/**
 * The picker card blurb for a document type. Falls back to the backend-supplied
 * `DocumentTypeInfo.description` for any id we don't have UI copy for.
 */
export function documentTypeDescription(
  identifier: string | null | undefined,
  fallback?: string | null,
): string {
  return (
    (identifier && DESCRIPTION_BY_IDENTIFIER[identifier]) || fallback || ''
  );
}

/**
 * Builds a lookup from a `DocumentType` enum value to its canonical display
 * name, from a `/document-types` response. `DocumentTypeInfo.name` is the single
 * source of truth for a type's label (see its spec description) — a type's label
 * must never be re-derived from the raw enum value. A `Document` only carries the
 * enum `type`, so the list uses this lookup to show the same label the picker
 * shows.
 */
export function documentTypeNames(
  infos: readonly DocumentTypeInfo[],
): ReadonlyMap<DocumentType, string> {
  const names = new Map<DocumentType, string>();
  for (const info of infos) {
    if (info.id && info.name) {
      names.set(info.id, info.name);
    }
  }
  return names;
}

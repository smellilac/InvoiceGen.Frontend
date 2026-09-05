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
  invoice: 'receipt_long',
  receipt: 'receipt',
  credit_note: 'currency_exchange',
  quote: 'request_quote',
  estimate: 'calculate',
  proforma_invoice: 'article',
  purchase_order: 'shopping_cart',
  sales_order: 'point_of_sale',
  statement: 'summarize',
  timesheet: 'schedule',
  work_order: 'engineering',
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

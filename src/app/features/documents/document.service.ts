import { Injectable, Signal, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';

import { Api } from '../../api/api';
import { ApiConfiguration } from '../../api/api-configuration';
import { createDocument } from '../../api/fn/documents/create-document';
import { createGuestDocument } from '../../api/fn/documents/create-guest-document';
import { deleteDocument } from '../../api/fn/documents/delete-document';
import { downloadDocumentPdf } from '../../api/fn/documents/download-document-pdf';
import { getDocument } from '../../api/fn/documents/get-document';
import { ListDocuments$Params, listDocuments } from '../../api/fn/documents/list-documents';
import { recordSettlement } from '../../api/fn/documents/record-settlement';
import { sendDocument } from '../../api/fn/documents/send-document';
import { CreateDocumentRequest } from '../../api/models/create-document-request';
import { Document } from '../../api/models/document';
import { GuestCreateDocumentRequest } from '../../api/models/guest-create-document-request';
import { DocumentList } from '../../api/models/document-list';
import { RecordSettlementRequest } from '../../api/models/record-settlement-request';
import { SendDocumentRequest } from '../../api/models/send-document-request';

/**
 * Display fallback for page size before the first response resolves. Matches the
 * backend's default `per_page` (see openapi.yaml `GET /documents`) so the UI
 * shows the right size up front; the request itself omits `per_page` and lets
 * the backend default apply, so the two never drift.
 */
export const DEFAULT_PER_PAGE = 10;

/** Backend cap on `per_page`; larger values are clamped before the request. */
export const MAX_PER_PAGE = 30;

/**
 * Empty page shown before the first response resolves and as the resource's
 * default value, so components can read `.value()` without null checks.
 */
const EMPTY_PAGE: DocumentList = { data: [], page: 1, per_page: DEFAULT_PER_PAGE, total: 0 };

/**
 * Wraps the generated `/documents*` client for the documents feature, so
 * components never build an endpoint or its response shape by hand (see
 * docs/conventions.md and docs/api-client.md). `DocumentTypeService` handles the
 * separate `/document-types` endpoint the picker uses.
 */
@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly api = inject(Api);
  private readonly config = inject(ApiConfiguration);

  /**
   * Reactive resource for `GET /documents`, the paginated history list. Pass a
   * reactive accessor (typically reading the caller's page/filter signals) so
   * the resource refetches whenever those change; it must be created from an
   * injection context (e.g. a component field initializer).
   *
   * Supports the query params the backend defines — `type`, `customer_id`,
   * `page`, `per_page`. `per_page` is only sent when a caller sets one (clamped
   * to {@link MAX_PER_PAGE}); omit it to let the backend default apply.
   * `customer_id` isn't wired up in the UI yet
   * (the customers feature doesn't exist), but is accepted here so adding it
   * later needs no service change.
   */
  list(params: () => ListDocuments$Params) {
    return httpResource<DocumentList>(
      () => {
        const p = params();
        // Only defined params go on the wire, to keep the URL clean and cache-friendly.
        // `per_page` is omitted unless a caller sets one, so the backend's default
        // governs page size and the two stay in sync automatically.
        const query: Record<string, string | number> = {
          page: p.page ?? 1,
        };
        if (p.per_page !== undefined) {
          query['per_page'] = Math.min(p.per_page, MAX_PER_PAGE);
        }
        if (p.type) {
          query['type'] = p.type;
        }
        if (p.customer_id) {
          query['customer_id'] = p.customer_id;
        }

        return { url: `${this.config.rootUrl}${listDocuments.PATH}`, params: query };
      },
      { defaultValue: EMPTY_PAGE },
    );
  }

  /**
   * `POST /documents`. Resolves with the server-computed `Document` (subtotal,
   * tax, total, etc.) on `201` — that math is never recomputed client-side, the
   * backend is the source of truth (see the backend's `x-rounding-policy`).
   */
  create(body: CreateDocumentRequest): Promise<Document> {
    return this.api.invoke(createDocument, { body });
  }

  /**
   * `POST /documents/guest` — the unauthenticated "try before you sign up" path.
   * Unlike {@link create}, the backend persists NOTHING (no `Document`, no
   * history, no `id`) and streams the rendered PDF straight back, so this
   * resolves with a `Blob` the caller downloads directly rather than a `Document`
   * to navigate to. Totals are still computed server-side by the same code path
   * as {@link create} (see the backend's `x-guest-document-policy`). The request
   * carries no bearer token and never triggers the 401-refresh dance — the auth
   * interceptor treats `/documents/guest` as public.
   */
  createGuest(body: GuestCreateDocumentRequest): Promise<Blob> {
    return this.api.invoke(createGuestDocument, { body });
  }

  /**
   * Reactive resource for `GET /documents/{id}`. The URL is composed from the
   * generated `getDocument.PATH` so it stays in sync with the spec. Stays idle
   * (no request) while `id` is undefined; call `.reload()` to re-fetch — the
   * detail view uses that after a send to pick up the latest `last_send_status`.
   */
  getResource(id: Signal<string | undefined>) {
    return httpResource<Document>(() => {
      const documentId = id();
      if (!documentId) {
        return undefined;
      }
      const path = getDocument.PATH.replace('{documentId}', encodeURIComponent(documentId));
      return `${this.config.rootUrl}${path}`;
    });
  }

  /**
   * `POST /documents/{id}/send`. Pass the recipient `to_email` and optional
   * `message` the user entered in the send dialog as the request body — the
   * backend needs a resolvable recipient (see the backend's
   * `x-email-delivery-policy.recipient_resolution`). Returns `202` (queued, not
   * delivered) — callers must not treat this as a "sent" confirmation; the real
   * outcome is read back from the document's `last_send_status` on a re-fetch
   * (see docs/architecture.md).
   */
  send(id: string, body: SendDocumentRequest): Promise<Document> {
    return this.api.invoke(sendDocument, { documentId: id, body });
  }

  /**
   * `POST /documents/{id}/settlements`. Records a payment (or, for a
   * `credit_note`, a refund) by applying `body.amount` as a SIGNED DELTA to the
   * document's `amount_settled` — positive to record more, negative to correct
   * a previous over-entry (see the backend's `x-settlement-policy`). Resolves
   * on `200` with the updated `Document` (new `amount_settled`, recomputed
   * `balance_remaining`); the caller can render those directly without a
   * re-fetch. A `422` (`ValidationErrorResponse`, field `amount`) means the
   * delta would drive `amount_settled` below zero or above `total`.
   */
  recordSettlement(id: string, body: RecordSettlementRequest): Promise<Document> {
    return this.api.invoke(recordSettlement, { documentId: id, body });
  }

  /** `GET /documents/{id}/pdf` — resolves with the PDF as a `Blob`. */
  downloadPdf(id: string): Promise<Blob> {
    return this.api.invoke(downloadDocumentPdf, { documentId: id });
  }

  /**
   * `DELETE /documents/{id}`. A soft delete server-side (the backend stamps
   * `deleted_at` and hides the row from list/get/pdf/send — see the backend's
   * document delete handler), so it drops out of history but stays recoverable.
   * Resolves on `204`.
   */
  delete(id: string): Promise<void> {
    return this.api.invoke(deleteDocument, { documentId: id });
  }
}

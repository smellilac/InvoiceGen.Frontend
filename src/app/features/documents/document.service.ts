import { Injectable, Signal, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';

import { Api } from '../../api/api';
import { ApiConfiguration } from '../../api/api-configuration';
import { createDocument } from '../../api/fn/documents/create-document';
import { downloadDocumentPdf } from '../../api/fn/documents/download-document-pdf';
import { getDocument } from '../../api/fn/documents/get-document';
import { sendDocument } from '../../api/fn/documents/send-document';
import { CreateDocumentRequest } from '../../api/models/create-document-request';
import { Document } from '../../api/models/document';

/**
 * Wraps the generated `/documents*` client for the documents feature, so
 * components never build the endpoint or its request/response shape by hand
 * (see docs/conventions.md and docs/api-client.md). Paginated listing will be
 * added here as an `httpResource` when the history view lands.
 */
@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly api = inject(Api);
  private readonly config = inject(ApiConfiguration);

  /**
   * `POST /documents`. Resolves with the server-computed `Document` (subtotal,
   * tax, total, etc.) on `201` — that math is never recomputed client-side, the
   * backend is the source of truth (see the backend's `x-rounding-policy`).
   */
  create(body: CreateDocumentRequest): Promise<Document> {
    return this.api.invoke(createDocument, { body });
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
   * `POST /documents/{id}/send`. Returns `202` (queued, not delivered) — callers
   * must not treat this as a "sent" confirmation; the real outcome is read back
   * from the document's `last_send_status` on a re-fetch (see docs/architecture.md
   * and the backend's `x-email-delivery-policy`).
   */
  send(id: string): Promise<Document> {
    return this.api.invoke(sendDocument, { documentId: id });
  }

  /** `GET /documents/{id}/pdf` — resolves with the PDF as a `Blob`. */
  downloadPdf(id: string): Promise<Blob> {
    return this.api.invoke(downloadDocumentPdf, { documentId: id });
  }
}

import { Injectable, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';

import { ApiConfiguration } from '../../api/api-configuration';
import { ListDocuments$Params, listDocuments } from '../../api/fn/documents/list-documents';
import { DocumentList } from '../../api/models/document-list';

/** Backend default when `per_page` is omitted (see openapi.yaml `GET /documents`). */
export const DEFAULT_PER_PAGE = 20;

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
  private readonly config = inject(ApiConfiguration);

  /**
   * Reactive resource for `GET /documents`, the paginated history list. Pass a
   * reactive accessor (typically reading the caller's page/filter signals) so
   * the resource refetches whenever those change; it must be created from an
   * injection context (e.g. a component field initializer).
   *
   * Supports the query params the backend defines — `type`, `customer_id`,
   * `page`, `per_page`. `per_page` defaults to {@link DEFAULT_PER_PAGE} and is
   * clamped to {@link MAX_PER_PAGE}. `customer_id` isn't wired up in the UI yet
   * (the customers feature doesn't exist), but is accepted here so adding it
   * later needs no service change.
   */
  list(params: () => ListDocuments$Params) {
    return httpResource<DocumentList>(
      () => {
        const p = params();
        // Only defined params go on the wire, to keep the URL clean and cache-friendly.
        const query: Record<string, string | number> = {
          page: p.page ?? 1,
          per_page: Math.min(p.per_page ?? DEFAULT_PER_PAGE, MAX_PER_PAGE),
        };
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
}

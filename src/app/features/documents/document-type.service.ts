import { Injectable, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';

import { ApiConfiguration } from '../../api/api-configuration';
import { listDocumentTypes } from '../../api/fn/document-types/list-document-types';
import { DocumentTypeInfo } from '../../api/models/document-type-info';

/**
 * Wraps the generated `/document-types` client for the documents feature, so
 * components never build the endpoint or its response shape by hand (see
 * docs/conventions.md and docs/api-client.md).
 *
 * The list is exposed as an `httpResource` rather than an imperative call so the
 * picker binds loading/error/value state directly, no hand-rolled RxJS. The URL
 * is composed from the generated `listDocumentTypes.PATH` and the shared
 * `ApiConfiguration.rootUrl`, which keeps it in sync with the spec — the path
 * is the same constant the generated client uses.
 */
@Injectable({ providedIn: 'root' })
export class DocumentTypeService {
  private readonly config = inject(ApiConfiguration);

  /**
   * Reactive resource for `GET /document-types`. Must be created from an
   * injection context (e.g. a component field initializer).
   */
  list() {
    return httpResource<DocumentTypeInfo[]>(
      () => `${this.config.rootUrl}${listDocumentTypes.PATH}`,
      { defaultValue: [] },
    );
  }
}

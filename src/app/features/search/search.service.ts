import { Injectable, inject } from '@angular/core';

import { Api } from '../../api/api';
import { searchDocuments } from '../../api/fn/search/search-documents';
import { SearchRequest } from '../../api/models/search-request';
import { SearchResponse } from '../../api/models/search-response';

/**
 * Wraps the `POST /api/search` client for the search feature, so the page never
 * builds the endpoint or its response shape by hand (see docs/api-client.md).
 * The call goes through `Api.invoke` like every other feature service, so the
 * auth interceptor attaches the current user's bearer token automatically —
 * search is an authenticated endpoint (see docs/authentication.md).
 */
@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly api = inject(Api);

  /**
   * `POST /api/search`. Sends the natural-language `query` plus any structured
   * filters the user set and resolves with the ranked matches. A `422` surfaces
   * as an `HttpErrorResponse` for the caller to handle; `401` is left to the
   * auth interceptor.
   */
  search(body: SearchRequest): Promise<SearchResponse> {
    return this.api.invoke(searchDocuments, { body });
  }
}

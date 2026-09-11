import { Injectable, Signal, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';

import { Api } from '../../api/api';
import { ApiConfiguration } from '../../api/api-configuration';
import { createCustomer } from '../../api/fn/customers/create-customer';
import { deleteCustomer } from '../../api/fn/customers/delete-customer';
import { getCustomer } from '../../api/fn/customers/get-customer';
import { ListCustomers$Params, listCustomers } from '../../api/fn/customers/list-customers';
import { updateCustomer } from '../../api/fn/customers/update-customer';
import { CreateCustomerRequest } from '../../api/models/create-customer-request';
import { Customer } from '../../api/models/customer';
import { CustomerList } from '../../api/models/customer-list';
import { UpdateCustomerRequest } from '../../api/models/update-customer-request';

/**
 * Display fallback for page size before the first response resolves. Matches the
 * backend's default `per_page` for `GET /customers` (see openapi.yaml) so the UI
 * shows the right size up front; the request itself omits `per_page` and lets
 * the backend default apply, so the two never drift.
 */
export const DEFAULT_PER_PAGE = 20;

/** Backend cap on `per_page`; larger values are clamped before the request. */
export const MAX_PER_PAGE = 30;

/**
 * Empty page shown before the first response resolves and as the resource's
 * default value, so components can read `.value()` without null checks.
 */
const EMPTY_PAGE: CustomerList = { data: [], page: 1, per_page: DEFAULT_PER_PAGE, total: 0 };

/**
 * Wraps the generated `/customers*` client for the customers feature, so
 * components never build an endpoint or its response shape by hand (see
 * docs/conventions.md and docs/api-client.md). The document detail view also
 * uses {@link get} to resolve a linked customer's saved email.
 */
@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly api = inject(Api);
  private readonly config = inject(ApiConfiguration);

  /**
   * Reactive resource for `GET /customers`, the paginated saved-customers list.
   * Pass a reactive accessor (typically reading the caller's page/search
   * signals) so the resource refetches whenever those change; it must be created
   * from an injection context (e.g. a component field initializer).
   *
   * Supports the query params the backend defines — `search` (case-insensitive
   * substring match against name), `page`, `per_page`. `per_page` is only sent
   * when a caller sets one (clamped to {@link MAX_PER_PAGE}); omit it to let the
   * backend default govern page size, so the two stay in sync automatically.
   *
   * The accessor may return `null` to keep the resource idle (no request) —
   * `/customers` requires auth, so the guest document form uses this to avoid
   * firing a call that would 401 (see `DocumentCreate`), the same idle pattern
   * {@link getResource} uses for an undefined id.
   */
  list(params: () => ListCustomers$Params | null) {
    return httpResource<CustomerList>(
      () => {
        const p = params();
        if (!p) {
          return undefined;
        }
        // Only defined params go on the wire, to keep the URL clean and cache-friendly.
        const query: Record<string, string | number> = {
          page: p.page ?? 1,
        };
        if (p.per_page !== undefined) {
          query['per_page'] = Math.min(p.per_page, MAX_PER_PAGE);
        }
        const search = p.search?.trim();
        if (search) {
          query['search'] = search;
        }

        return { url: `${this.config.rootUrl}${listCustomers.PATH}`, params: query };
      },
      { defaultValue: EMPTY_PAGE },
    );
  }

  /**
   * Reactive resource for `GET /customers/{id}`. The URL is composed from the
   * generated `getCustomer.PATH` so it stays in sync with the spec. Stays idle
   * (no request) while `id` is undefined — the edit form uses that to prefill
   * once the id from the route resolves.
   */
  getResource(id: Signal<string | undefined>) {
    return httpResource<Customer>(() => {
      const customerId = id();
      if (!customerId) {
        return undefined;
      }
      const path = getCustomer.PATH.replace('{customerId}', encodeURIComponent(customerId));
      return `${this.config.rootUrl}${path}`;
    });
  }

  /** `GET /customers/{id}`. Resolves with the `Customer` on `200`. */
  get(id: string): Promise<Customer> {
    return this.api.invoke(getCustomer, { customerId: id });
  }

  /** `POST /customers`. Resolves with the created `Customer` on `201`. */
  create(body: CreateCustomerRequest): Promise<Customer> {
    return this.api.invoke(createCustomer, { body });
  }

  /**
   * `PATCH /customers/{id}`. Every field is optional on the update request, so
   * callers can safely send the full current form values without diffing.
   * Resolves with the updated `Customer` on `200`.
   */
  update(id: string, body: UpdateCustomerRequest): Promise<Customer> {
    return this.api.invoke(updateCustomer, { customerId: id, body });
  }

  /**
   * `DELETE /customers/{id}`. A soft delete server-side (the backend hides the
   * row from the list and blocks it from being picked on new documents), so it
   * drops out of the list but any documents already created from it are
   * unaffected — their `to` text is a frozen snapshot, not a live link.
   * Resolves on `204`.
   */
  delete(id: string): Promise<void> {
    return this.api.invoke(deleteCustomer, { customerId: id });
  }
}

import { Injectable, inject } from '@angular/core';

import { Api } from '../../api/api';
import { getCustomer } from '../../api/fn/customers/get-customer';
import { Customer } from '../../api/models/customer';

/**
 * Wraps the generated `/customers*` client. The customers feature has no UI of
 * its own yet, but the document detail view needs to resolve a linked
 * customer's saved email to pre-fill the send dialog — that call goes through
 * here rather than a hand-built request (see docs/conventions.md).
 */
@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly api = inject(Api);

  /** `GET /customers/{id}`. Resolves with the `Customer` on `200`. */
  get(id: string): Promise<Customer> {
    return this.api.invoke(getCustomer, { customerId: id });
  }
}

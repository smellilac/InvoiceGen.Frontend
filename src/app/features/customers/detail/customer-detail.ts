import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';

import { DocumentList } from '../../documents/list/document-list';
import { CustomerService } from '../customer.service';

/**
 * Read-only customer detail view (route `/customers/:id`). Shows the saved
 * customer's fields with quick actions — "Edit" opens the form at
 * `/customers/:id/edit`, and "Create document for this customer" jumps to the
 * document-type picker carrying `?customerId=<id>` so the create form links this
 * customer automatically. Below that, the customer's own document history is
 * rendered by reusing {@link DocumentList} in embedded mode (filtered via
 * `GET /documents?customer_id=<id>`).
 */
@Component({
  selector: 'app-customer-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    DocumentList,
  ],
  templateUrl: './customer-detail.html',
  styleUrl: './customer-detail.scss',
})
export class CustomerDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly customers = inject(CustomerService);

  /** The `:id` route param identifying the customer being viewed. */
  protected readonly id = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? undefined)),
    { initialValue: undefined },
  );

  /** The customer being viewed — see `CustomerService.getResource`. */
  protected readonly customer = this.customers.getResource(this.id);
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth.service';
import { Logo } from '../../../shared/logo';
import { DocumentTypeService } from '../document-type.service';

/**
 * The backend's `DocumentTypeInfo.icon` is a plain identifier (e.g. "invoice"),
 * not a Material Symbols name, so it can't go straight into `<mat-icon>`. This
 * maps each of the 12 type identifiers to a real Material Symbols icon.
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
 * First screen after login (route `/`). Lists the document types the backend
 * offers as tiles; picking one navigates toward the (not-yet-built) create form
 * at `/documents/new?type=<id>`. Loading, error, and empty states are all
 * handled — see docs/architecture.md for where this sits in the routing map.
 */
@Component({
  selector: 'app-document-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    Logo,
  ],
  templateUrl: './document-picker.html',
  styleUrl: './document-picker.scss',
})
export class DocumentPicker {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly documentTypes = inject(DocumentTypeService);

  protected readonly types = this.documentTypes.list();

  /** Resolves a backend icon identifier to a Material Symbols icon name. */
  protected iconFor(identifier: string | undefined): string {
    return (identifier && ICON_BY_IDENTIFIER[identifier]) || FALLBACK_ICON;
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}

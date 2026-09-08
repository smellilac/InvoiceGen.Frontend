import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { PageEvent, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';

import { DocumentType } from '../../../api/models/document-type';
import { MoneyPipe } from '../../../shared/currency.pipe';
import { isOverdue, overdueLabel } from '../../../shared/overdue';
import { documentTypeIcon, documentTypeNames } from '../document-type-display';
import { DEFAULT_PER_PAGE, DocumentService } from '../document.service';
import { DocumentTypeService } from '../document-type.service';

/**
 * Paginated document history (route `/documents`). Lists documents newest-first
 * as the backend returns them, filterable by type, with Material's paginator
 * wired to the API's `page`/`per_page`/`total` response fields. Loading, empty,
 * and error states are all handled — see docs/architecture.md for where this
 * sits in the routing map.
 *
 * The type filter dropdown and each row's type label/icon reuse the shared
 * `document-type-display` helpers, so they match the picker exactly.
 */
@Component({
  selector: 'app-document-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    DatePipe,
    NgTemplateOutlet,
    MoneyPipe,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './document-list.html',
  styleUrl: './document-list.scss',
})
export class DocumentList {
  private readonly documents = inject(DocumentService);
  private readonly documentTypes = inject(DocumentTypeService);

  /**
   * When set, the list is embedded in a host page (e.g. a customer's detail view):
   * it filters to this customer's documents and drops its own page header, intro,
   * and type filter so it slots in as a plain history table. Left unset, it renders
   * as the standalone `/documents` page.
   */
  readonly customerId = input<string>();

  /** True when hosted inside another page via {@link customerId}. */
  protected readonly embedded = computed(() => !!this.customerId());

  /** Current 1-based page and the active type filter (null = all types). */
  protected readonly page = signal(1);
  protected readonly typeFilter = signal<DocumentType | null>(null);

  /**
   * Page-size fallback shown by the paginator until the first response lands;
   * afterwards it reflects the `per_page` the backend actually returned.
   */
  protected readonly perPage = DEFAULT_PER_PAGE;

  /**
   * The paginated result. Reads `page`/`typeFilter`/`customerId` reactively, so
   * changing any of them refetches. `per_page` is deliberately omitted so the
   * backend default governs page size. `customer_id` is only sent when the list is
   * embedded for a specific customer (see {@link customerId}).
   */
  protected readonly documentsPage = this.documents.list(() => ({
    type: this.typeFilter() ?? undefined,
    customer_id: this.customerId() || undefined,
    page: this.page(),
  }));

  /** The 12 document types, for the filter dropdown (name + icon). */
  protected readonly types = this.documentTypes.list();

  /** Lookup from a document's `type` enum to its canonical display name. */
  private readonly typeNames = computed(() => documentTypeNames(this.types.value()));

  /** Resolves a document type / icon identifier to a Material Symbols icon. */
  protected readonly iconFor = documentTypeIcon;

  /** Whether a row is past due, and its type-aware badge copy (see shared/overdue). */
  protected readonly isOverdue = isOverdue;
  protected readonly overdueLabel = overdueLabel;

  /** Canonical display name for a document's type, falling back to the raw enum. */
  protected nameFor(type: DocumentType | undefined): string {
    return (type && this.typeNames().get(type)) || (type ?? '');
  }

  /** Filter changed: apply it and jump back to the first page. */
  protected onTypeChange(type: DocumentType | null): void {
    this.typeFilter.set(type);
    this.page.set(1);
  }

  /** Paginator moved: the event's `pageIndex` is 0-based, the API is 1-based. */
  protected onPage(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
  }
}

import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';

import { SearchRequest } from '../../api/models/search-request';
import { SearchResult } from '../../api/models/search-result';
import { MoneyPipe } from '../../shared/currency.pipe';
import { SearchService } from './search.service';

/**
 * Natural-language search over the user's documents (route `/search`). A single
 * text query plus optional structured filters (status, min/max amount, date
 * range) POST to `/api/search`; matches render as cards showing each result's
 * document id, relevance score, and matched snippet, linking through to the
 * document's detail page.
 *
 * Mirrors the customer form and document list for layout and state handling:
 * a Reactive Form, a `MoneyPipe` for any amount, and loading/empty/error states
 * (see docs/architecture.md). The `POST /api/search` call carries the user's
 * bearer token via the shared auth interceptor (see docs/authentication.md).
 */
@Component({
  selector: 'app-search-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideNativeDateAdapter()],
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DecimalPipe,
    MoneyPipe,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './search-page.html',
  styleUrl: './search-page.scss',
})
export class SearchPage {
  private readonly fb = inject(FormBuilder);
  private readonly search = inject(SearchService);

  protected readonly searching = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /** Null until the first search resolves; then the (possibly empty) matches. */
  protected readonly results = signal<SearchResult[] | null>(null);

  /** The document statuses the filter offers — mirrors `Document.status`. */
  protected readonly statuses = [
    { value: 'draft', label: 'Draft' },
    { value: 'generated', label: 'Generated' },
  ] as const;

  protected readonly form = this.fb.nonNullable.group({
    query: this.fb.nonNullable.control('', Validators.required),
    status: this.fb.control<'draft' | 'generated' | null>(null),
    minAmount: this.fb.control<number | null>(null),
    maxAmount: this.fb.control<number | null>(null),
    dateFrom: this.fb.control<Date | null>(null),
    dateTo: this.fb.control<Date | null>(null),
  });

  protected async submit(): Promise<void> {
    if (this.searching()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.searching.set(true);
    this.errorMessage.set(null);

    try {
      const response = await this.search.search(this.buildRequest());
      this.results.set(response.results ?? []);
    } catch (error) {
      this.results.set(null);
      this.handleError(error);
    } finally {
      this.searching.set(false);
    }
  }

  /**
   * Assembles the form into a {@link SearchRequest}. Only filters the user
   * actually set go on the wire — an untouched filter is omitted so the backend
   * doesn't treat it as a constraint.
   */
  private buildRequest(): SearchRequest {
    const raw = this.form.getRawValue();
    const body: SearchRequest = { query: raw.query.trim() };

    if (raw.status) {
      body.status = raw.status;
    }
    if (raw.minAmount != null) {
      body.min_amount = raw.minAmount;
    }
    if (raw.maxAmount != null) {
      body.max_amount = raw.maxAmount;
    }
    if (raw.dateFrom) {
      body.date_from = toIsoDate(raw.dateFrom);
    }
    if (raw.dateTo) {
      body.date_to = toIsoDate(raw.dateTo);
    }

    return body;
  }

  private handleError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 429) {
        this.errorMessage.set('Too many requests — please try again shortly.');
        return;
      }
      if (error.status === 0) {
        this.errorMessage.set('Could not reach the server. Check your connection and try again.');
        return;
      }
    }
    this.errorMessage.set('Something went wrong while searching. Please try again.');
  }
}

/** Formats a `Date` as a `YYYY-MM-DD` string in local time (no timezone shift). */
function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

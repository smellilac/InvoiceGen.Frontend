import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { PageEvent, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

import { DEFAULT_PER_PAGE, CustomerService } from '../customer.service';

/** Debounce before a keystroke in the search box turns into a request/URL update. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Paginated saved-customers list (route `/customers`). Lists customers
 * alphabetically as the backend returns them, filterable by a debounced search
 * box (case-insensitive substring match against name, per the spec), with
 * Material's paginator wired to the API's `page`/`per_page`/`total` response
 * fields. Loading, empty, and error states are all handled.
 *
 * Mirrors the documents list (see `document-list`): the search term is persisted
 * to the `search` query param so it survives refresh/back, and `per_page` is
 * left off the request so the backend default (20) governs page size.
 */
@Component({
  selector: 'app-customer-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './customer-list.html',
  styleUrl: './customer-list.scss',
})
export class CustomerListPage {
  private readonly customers = inject(CustomerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** Current 1-based page. Reset to 1 whenever the search term changes. */
  protected readonly page = signal(1);

  /**
   * Page-size fallback shown by the paginator until the first response lands;
   * afterwards it reflects the `per_page` the backend actually returned.
   */
  protected readonly perPage = DEFAULT_PER_PAGE;

  /** The search box, seeded from the `?search=` query param on load. */
  protected readonly searchControl = new FormControl(
    this.route.snapshot.queryParamMap.get('search') ?? '',
    { nonNullable: true },
  );

  /**
   * The active search term, read reactively from the URL so it survives a
   * refresh or back-navigation. The debounced input handler below writes it
   * there; this signal feeds the resource.
   */
  protected readonly search = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('search') ?? '')),
    { initialValue: this.route.snapshot.queryParamMap.get('search') ?? '' },
  );

  /**
   * The paginated result. Reads `search`/`page` reactively, so changing either
   * refetches. `per_page` is deliberately omitted so the backend default (20)
   * governs page size.
   */
  protected readonly customersPage = this.customers.list(() => ({
    search: this.search() || undefined,
    page: this.page(),
  }));

  constructor() {
    // Debounce keystrokes, then push the term into the URL (source of truth for
    // `search`) and jump back to the first page. `takeUntilDestroyed` (run here
    // in the constructor's injection context) tears the subscription down with
    // the component.
    this.searchControl.valueChanges
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => {
        const term = value.trim();
        this.page.set(1);
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { search: term || null },
          queryParamsHandling: 'merge',
        });
      });
  }

  /** Paginator moved: the event's `pageIndex` is 0-based, the API is 1-based. */
  protected onPage(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
  }
}

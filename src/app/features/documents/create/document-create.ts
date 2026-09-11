import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, map } from 'rxjs/operators';

import { CreateDocumentRequest } from '../../../api/models/create-document-request';
import { Customer } from '../../../api/models/customer';
import { Document } from '../../../api/models/document';
import { DocumentType } from '../../../api/models/document-type';
import { GuestCreateDocumentRequest } from '../../../api/models/guest-create-document-request';
import { LineItem } from '../../../api/models/line-item';
import { ValidationErrorResponse } from '../../../api/models/validation-error-response';
import { AuthService } from '../../../core/auth.service';
import { CustomerService } from '../../customers/customer.service';
import { DocumentService } from '../document.service';
import { DocumentTypeService } from '../document-type.service';
import { GUEST_FREE_DOCUMENT_LIMIT, GuestAttemptsService } from '../guest-attempts.service';
import { GuestPromoBanner } from '../guest-promo-banner';

/** A short list of common ISO 4217 codes for the currency picker. */
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'NZD'] as const;

/** Debounce before a keystroke in the customer autocomplete turns into a request. */
const CUSTOMER_SEARCH_DEBOUNCE_MS = 300;

/** Shown when a guest clicks a result-view action that requires an account. */
const GUEST_LOCKED_MESSAGE = 'To unlock this feature, create an account or sign in.';

/** Shown on a submit attempt while the form still has missing/invalid fields. */
const INVALID_FORM_MESSAGE =
  'Please fill in all required fields correctly before creating this document.';

/**
 * The in-memory result of a successful guest creation. Nothing is persisted for a
 * guest (there is no saved document and no id), so we hold the rendered PDF blob
 * and a snapshot of the submitted fields here to drive the detail-styled result
 * view — the Download action re-saves this blob with no new network call. Purely
 * local UI state: never stored or restored across navigation.
 */
interface GuestResult {
  blob: Blob;
  fileName: string;
  typeName: string;
  to: string;
  from: string;
  number: string;
  relatedDocumentNumber: string;
  remaining: number;
}

/**
 * Create form for a document (`/documents/new?type=<id>`). The type was already
 * chosen on the picker and arrives as the `?type=` query param — it's shown
 * read-only here, not editable. Submits a `CreateDocumentRequest` via
 * `POST /documents` and, on `201`, navigates to the new document's detail view.
 *
 * Deliberately does NOT compute subtotal/tax/total: that math belongs to the
 * backend alone (see docs/architecture.md and the backend's `x-rounding-policy`).
 * This form only collects and submits the raw inputs.
 */
@Component({
  selector: 'app-document-create',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideNativeDateAdapter()],
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    GuestPromoBanner,
  ],
  templateUrl: './document-create.html',
  styleUrl: './document-create.scss',
})
export class DocumentCreate {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly customers = inject(CustomerService);
  private readonly documents = inject(DocumentService);
  private readonly documentTypes = inject(DocumentTypeService);
  private readonly guestAttempts = inject(GuestAttemptsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly currencies = CURRENCIES;
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /**
   * True for a signed-out visitor. Reliable at construction because the app's
   * silent session restore runs as an APP_INITIALIZER, so auth state is already
   * settled before this component renders (see docs/authentication.md). Drives
   * the whole guest branch: no customer picker, `from` required, submit posts to
   * `/documents/guest` and downloads instead of navigating.
   */
  protected readonly isGuest = computed(() => !this.auth.isAuthenticated());

  /** The tunable free-document limit, for the exhausted-gate copy. */
  protected readonly guestLimit = GUEST_FREE_DOCUMENT_LIMIT;

  /**
   * A guest who has used all their free documents: the form is replaced by the
   * sign-up gate rather than letting them fill it out only to be blocked on
   * submit. Never true for a signed-in user.
   */
  protected readonly guestExhausted = computed(
    () => this.isGuest() && !this.guestAttempts.hasRemaining(),
  );

  /**
   * Set after a guest document has been generated — holds the rendered PDF blob
   * and a snapshot of the submitted fields for the detail-styled result view that
   * replaces the form. Cleared when the guest starts another document. Null (and
   * irrelevant) for signed-in users, who navigate to the saved document's detail
   * page instead. See {@link GuestResult}.
   */
  protected readonly guestResult = signal<GuestResult | null>(null);

  /** The document type chosen on the picker, from the `?type=` query param. */
  protected readonly type = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('type') as DocumentType | null)),
    { initialValue: null },
  );

  /**
   * Set when arriving via the detail page's "Edit" action
   * (`/documents/new?duplicateFrom=<id>`). We fetch that document and prefill the
   * form from it; on submit we `POST` a corrected copy and then soft-delete this
   * source, so the user sees an in-place edit even though the backend has no
   * PATCH for documents (see docs/architecture.md and `submit`).
   */
  private readonly duplicateFromId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('duplicateFrom') ?? undefined)),
    { initialValue: undefined },
  );
  private readonly source = this.documents.getResource(this.duplicateFromId);
  /** Guards the one-shot prefill so user edits aren't clobbered by a later resource emission. */
  private prefilled = false;

  /**
   * The "Select existing customer" autocomplete input. Independent of the `to`
   * textarea: picking a customer sets `customer_id` and pre-fills `to`, but `to`
   * stays freely editable afterwards and editing it never unlinks the customer
   * (the link is still useful for filtering and email resolution). The value is a
   * plain string while typing and briefly the picked `Customer` object right after
   * selection — {@link displayCustomer} renders either.
   */
  protected readonly customerControl = new FormControl<string | Customer>('', {
    nonNullable: true,
  });
  /** Debounced search term feeding {@link customerResults}. */
  private readonly customerSearch = signal('');
  /**
   * Saved-customer options for the autocomplete (`GET /customers?search=`), same
   * search pattern as the customers list. Reads `customerSearch` reactively so it
   * refetches as the user types.
   */
  protected readonly customerResults = this.customers.list(() =>
    // Customers is an authenticated-only resource — a guest has none to pick, and
    // the request would 401. Return null to keep the resource idle for guests
    // (the picker UI is hidden for them anyway).
    this.isGuest() ? null : { search: this.customerSearch() || undefined, page: 1 },
  );
  /** The currently linked saved customer, if any — drives the "None" option and hint. */
  protected readonly selectedCustomer = signal<Customer | null>(null);

  /**
   * Set when arriving from a customer's detail page
   * (`/documents/new?customerId=<id>`). We fetch that customer and apply the same
   * selection logic as picking them from the autocomplete (sets `customer_id`,
   * pre-fills `to`).
   */
  private readonly customerIdParam = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('customerId') ?? undefined)),
    { initialValue: undefined },
  );
  private readonly customerParam = this.customers.getResource(this.customerIdParam);
  /** Guards the one-shot query-param prefill so a later emission can't re-apply it. */
  private customerParamApplied = false;

  /**
   * The signed-in user's profile (`GET /auth/me`), used to decide whether the
   * "include my logo" toggle is meaningful. We read it via the resource rather
   * than {@link AuthService.currentUser} because the in-memory user isn't
   * populated on a fresh page load (see the resource's doc comment) — this way
   * a hard-refresh onto `/documents/new` still knows about the profile logo.
   */
  // Guarded so a guest never fires `GET /auth/me` (there's no profile, and it
  // would 401) — the logo toggle it feeds is hidden for guests anyway.
  private readonly profile = this.auth.currentUserResource(() => !this.isGuest());
  /** True once the profile has a logo the backend can stamp onto the PDF. */
  protected readonly hasProfileLogo = computed(() => !!this.profile.value()?.logo_url);
  /** Suppresses the "set a logo" hint until we actually know the profile has none. */
  protected readonly profileLoading = computed(() => this.profile.isLoading());
  /** Guards the one-shot create-mode default so it doesn't clobber a user's later toggle. */
  private logoDefaulted = false;

  /** `related_document_number` is meaningful mainly for credit notes (see the spec). */
  protected readonly isCreditNote = computed(() => this.type() === 'credit_note');

  /**
   * The type's canonical display name for the heading. Prefers the backend's
   * `DocumentTypeInfo.name` (the single source of truth for a type's label —
   * see its spec description), falling back to a humanized enum value while the
   * list is still loading or if the type is unknown.
   */
  private readonly types = this.documentTypes.list();
  protected readonly typeName = computed(() => {
    const type = this.type();
    if (!type) {
      return null;
    }
    return this.types.value().find((info) => info.id === type)?.name ?? humanize(type);
  });

  protected readonly form = this.fb.group({
    to: this.fb.nonNullable.control('', Validators.required),
    // Optional link to a saved customer. Set/cleared by the autocomplete (or the
    // `?customerId=` param), carried over by `prefillFrom` when editing, and kept
    // independent of `to` — see the customer-picker fields above. Never a visible
    // control; there's no template binding for it.
    customer_id: this.fb.control<string | null>(null),
    from: this.fb.nonNullable.control(''),
    date: this.fb.control<Date | null>(new Date(), Validators.required),
    due_date: this.fb.control<Date | null>(null),
    number: this.fb.nonNullable.control(''),
    related_document_number: this.fb.nonNullable.control(''),
    currency: this.fb.nonNullable.control('USD', Validators.required),
    items: this.fb.array([this.createItem()], Validators.required),
    tax_percent: this.fb.control<number | null>(0),
    discount_percent: this.fb.control<number | null>(0),
    shipping_amount: this.fb.control<number | null>(0),
    notes: this.fb.nonNullable.control(''),
    terms: this.fb.nonNullable.control(''),
    // Mirrors the backend default (`include_logo` defaults to true). In create
    // mode an effect narrows this to whether the profile actually has a logo; in
    // edit mode `prefillFrom` sets it from the source document's snapshot.
    include_logo: this.fb.nonNullable.control(true),
  });

  constructor() {
    if (this.isGuest()) {
      // A guest has no saved business profile to fall back on, so `from` must be
      // filled in on every guest document — the backend requires it too (see
      // GuestCreateDocumentRequest). Signed-in users keep it optional.
      this.form.controls.from.addValidators(Validators.required);
      this.form.controls.from.updateValueAndValidity({ emitEvent: false });
    }

    const user = this.auth.currentUser();
    if (user) {
      const from = [user.business_name, user.business_address].filter(Boolean).join('\n');
      if (from) {
        this.form.controls.from.setValue(from);
      }
      // Respect the user's saved default currency when it's one we offer;
      // otherwise the field keeps its USD default.
      if (user.default_currency && (CURRENCIES as readonly string[]).includes(user.default_currency)) {
        this.form.controls.currency.setValue(user.default_currency);
      }
    }

    // When editing (duplicating) an existing document, prefill from it once its
    // GET resolves. Runs after the profile defaults above so the source document's
    // own `from`/`currency` win.
    effect(() => {
      const doc = this.source.value();
      if (!doc || this.prefilled) {
        return;
      }
      this.prefilled = true;
      this.prefillFrom(doc);
    });

    // Create mode only: default the logo toggle to checked when the profile has a
    // logo, unchecked otherwise, once `GET /auth/me` resolves. Skipped when
    // editing — there `prefillFrom` seeds it from the source document instead, so
    // we don't reset a specific document's choice to today's profile default.
    effect(() => {
      const user = this.profile.value();
      if (!user || this.logoDefaulted || this.duplicateFromId()) {
        return;
      }
      this.logoDefaulted = true;
      this.form.controls.include_logo.setValue(!!user.logo_url);
    });

    // Debounce keystrokes in the customer autocomplete into the search signal.
    // Only a typed string drives the search — selecting an option emits the
    // `Customer` object, which the option handler deals with instead.
    this.customerControl.valueChanges
      .pipe(debounceTime(CUSTOMER_SEARCH_DEBOUNCE_MS), takeUntilDestroyed())
      .subscribe((value) => {
        if (typeof value === 'string') {
          this.customerSearch.set(value.trim());
        }
      });

    // Arriving from a customer's detail page (`?customerId=`): once that customer
    // resolves, apply the same selection as picking them manually. Skipped in edit
    // mode, where `prefillFrom` already seeds `customer_id`/`to` from the source
    // document's own (frozen) values.
    effect(() => {
      const customer = this.customerParam.value();
      if (!customer || this.customerParamApplied || this.duplicateFromId()) {
        return;
      }
      this.customerParamApplied = true;
      this.applyCustomer(customer);
    });
  }

  protected get items(): FormArray {
    return this.form.controls.items;
  }

  protected addItem(): void {
    this.items.push(this.createItem());
  }

  protected removeItem(index: number): void {
    // Keep at least one line item — the form can't be submitted without one.
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  private createItem() {
    return this.fb.group({
      name: this.fb.nonNullable.control('', Validators.required),
      description: this.fb.nonNullable.control(''),
      quantity: this.fb.control<number | null>(null, Validators.required),
      unit_cost: this.fb.control<number | null>(null, Validators.required),
      reference: this.fb.nonNullable.control(''),
    });
  }

  /** Renders the autocomplete value, whether it's typed text or a picked customer. */
  protected readonly displayCustomer = (value: string | Customer | null): string =>
    typeof value === 'string' ? value : (value?.name ?? '');

  /**
   * An autocomplete option was chosen: a `Customer` links it, or `null` (the
   * "None" option) unlinks it. Editing `to` afterwards never runs through here, so
   * the link survives manual edits.
   */
  protected onCustomerSelected(value: Customer | null): void {
    if (value === null) {
      this.clearCustomer();
    } else {
      this.applyCustomer(value);
    }
  }

  /**
   * Links a saved customer: records it on `customer_id`, pre-fills `to` from the
   * customer's name/address (still freely editable afterwards), and shows the name
   * in the autocomplete input without re-triggering a search.
   */
  private applyCustomer(customer: Customer): void {
    this.selectedCustomer.set(customer);
    this.form.controls.customer_id.setValue(customer.id ?? null);
    const to = [customer.name, customer.address].filter(Boolean).join('\n');
    this.form.controls.to.setValue(to);
    this.customerControl.setValue(customer.name ?? '', { emitEvent: false });
    this.customerSearch.set('');
  }

  /**
   * Unlinks the saved customer (the "None" option / clear button): drops
   * `customer_id` and empties the autocomplete input. Leaves the `to` textarea
   * untouched — whatever was typed there stays.
   */
  protected clearCustomer(): void {
    this.selectedCustomer.set(null);
    this.form.controls.customer_id.setValue(null);
    this.customerControl.setValue('', { emitEvent: false });
    this.customerSearch.set('');
  }

  /**
   * Resolves a linked customer purely to show it as selected in the autocomplete
   * (used by the edit flow, where `prefillFrom` already set `customer_id` and the
   * document's frozen `to`). Deliberately does NOT touch `to` — the document's own
   * snapshot wins. Best-effort: on failure the link stays, only the display hint
   * is skipped.
   */
  private async showLinkedCustomer(customerId: string): Promise<void> {
    try {
      const customer = await this.customers.get(customerId);
      this.selectedCustomer.set(customer);
      this.customerControl.setValue(customer.name ?? '', { emitEvent: false });
    } catch {
      // Non-fatal — see the doc comment.
    }
  }

  /**
   * Copies a source document's fields onto the form for the "Edit" flow.
   * Everything the form collects is mapped, including line items — the `Document`
   * now round-trips them (see the backend's `DocumentDto`). Only the inputs are
   * copied, never the server-computed totals; those get recomputed on submit.
   * The result is an unsaved draft: submitting `POST`s the corrected copy and
   * soft-deletes this source (see `submit`).
   */
  private prefillFrom(doc: Document): void {
    // Rebuild the line-item FormArray to match the source (never fewer than one row).
    this.items.clear();
    const items = doc.items ?? [];
    if (items.length === 0) {
      this.items.push(this.createItem());
    } else {
      for (const item of items) {
        const group = this.createItem();
        group.patchValue({
          name: item.name ?? '',
          description: item.description ?? '',
          quantity: item.quantity ?? null,
          unit_cost: item.unit_cost ?? null,
          reference: item.reference ?? '',
        });
        this.items.push(group);
      }
    }

    this.form.patchValue({
      to: doc.to ?? '',
      // Carry the customer link over too, the same as every other field — a
      // duplicated/edited document keeps pointing at its customer (used for
      // filtering and send-time email resolution) even though `to` is a frozen
      // snapshot that may diverge. Show it as selected in the autocomplete.
      customer_id: doc.customer_id ?? null,
      from: doc.from ?? '',
      date: doc.date ? fromIsoDate(doc.date) : this.form.controls.date.value,
      due_date: doc.due_date ? fromIsoDate(doc.due_date) : null,
      number: doc.number ?? '',
      related_document_number: doc.related_document_number ?? '',
      currency: doc.currency ?? this.form.controls.currency.value,
      tax_percent: doc.tax_percent ?? 0,
      discount_percent: doc.discount_percent ?? 0,
      shipping_amount: doc.shipping_amount ?? 0,
      notes: doc.notes ?? '',
      terms: doc.terms ?? '',
      // Prefill from whether THIS document was created with a logo — not today's
      // profile default — since we're editing a specific document's data. (The
      // toggle only shows if the current profile still has a logo; see the
      // template's `hasProfileLogo` gate.)
      include_logo: !!doc.logo_url,
    });

    if (doc.customer_id) {
      void this.showLinkedCustomer(doc.customer_id);
    }
  }

  protected async submit(): Promise<void> {
    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      // Reveal every invalid field's error styling (not just the ones the user
      // has already touched), tell them plainly what's wrong via the same toast
      // we use for other user-facing messages, and jump them to the first bad
      // field — otherwise a required field scrolled far out of view in a long
      // form makes the submit look like it silently did nothing.
      this.form.markAllAsTouched();
      this.snackBar.open(INVALID_FORM_MESSAGE, 'Dismiss', { duration: 6000 });
      this.focusFirstInvalidField();
      return;
    }

    const type = this.type();
    if (!type) {
      this.errorMessage.set('No document type was selected — go back and pick one.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      if (this.isGuest()) {
        await this.generateGuestDocument(type);
      } else {
        await this.createSavedDocument(type);
      }
    } catch (error) {
      this.handleError(error);
    } finally {
      this.submitting.set(false);
    }
  }

  /**
   * Moves the user to the first invalid control after a blocked submit. Querying
   * the live DOM (rather than walking the model) lets the *topmost* invalid field
   * win regardless of which card it sits in, so scroll-and-focus always lands on
   * the first thing the user would see. `[formControlName]` narrows the match to
   * real controls — the invalid `ng-invalid` classes Angular also puts on the
   * wrapping form/array groups are skipped. Its red error styling is already
   * showing thanks to `markAllAsTouched` above.
   */
  private focusFirstInvalidField(): void {
    const firstInvalid = this.host.nativeElement.querySelector<HTMLElement>(
      '[formControlName].ng-invalid',
    );
    if (!firstInvalid) {
      return;
    }
    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    firstInvalid.focus({ preventScroll: true });
  }

  /**
   * Signed-in path: `POST /documents`, then (in edit mode) soft-delete the source
   * and navigate to the new document's detail page. Unchanged from the original
   * flow — only lifted out of `submit` so the guest branch can sit beside it.
   */
  private async createSavedDocument(type: DocumentType): Promise<void> {
    const doc = await this.documents.create(this.buildRequest(type));

    // In edit mode the new document is the corrected copy, so soft-delete the
    // source it was edited from — the net effect is an in-place edit. The save
    // has already succeeded here, so a failed delete must not block navigation
    // or imply the save failed; it only leaves the original behind, which we
    // flag as a non-blocking warning so the user can remove it manually.
    const sourceId = this.duplicateFromId();
    if (sourceId) {
      try {
        await this.documents.delete(sourceId);
      } catch {
        this.snackBar.open(
          'Saved, but couldn’t remove the original document — you may want to delete it manually.',
          'Dismiss',
          { duration: 8000 },
        );
      }
    }

    // `justCreated` drives the one-time "generated!" banner on the detail page;
    // it rides in router navigation state so it doesn't appear on normal revisits.
    await this.router.navigate(['/documents', doc.id], { state: { justCreated: true } });
  }

  /**
   * Guest path: `POST /documents/guest` returns the rendered PDF directly (nothing
   * is saved, so there's no detail page to visit). Rather than download straight
   * away, we keep the blob and a snapshot of the submitted fields in memory and
   * switch to a detail-styled result view where the guest can download on demand —
   * only now that creation has actually succeeded do we burn one free attempt. A
   * thrown error (422/429/network) propagates to `submit`'s catch, leaving the
   * attempt count untouched so a guest who fixes a validation error isn't charged.
   */
  private async generateGuestDocument(type: DocumentType): Promise<void> {
    const blob = await this.documents.createGuest(this.buildGuestRequest(type));
    this.guestAttempts.recordSuccess();
    const raw = this.form.getRawValue();
    this.guestResult.set({
      blob,
      fileName: this.guestFileName(type),
      typeName: this.typeName() ?? humanize(type),
      to: raw.to.trim(),
      from: raw.from.trim(),
      number: raw.number.trim(),
      relatedDocumentNumber: raw.related_document_number.trim(),
      remaining: this.guestAttempts.remaining(),
    });
  }

  /**
   * Result-view Download: saves the PDF that's already in memory from creation —
   * no second network call. Guest documents are never persisted, so there's no id
   * to re-fetch by anyway.
   */
  protected downloadGuestResult(): void {
    const result = this.guestResult();
    if (!result) {
      return;
    }
    this.triggerDownload(result.blob, result.fileName);
  }

  /**
   * Result-view Edit / Delete / Send email: none of these have a real action for a
   * guest because nothing is persisted. Nudge them toward an account instead — no
   * navigation, no API call.
   */
  protected lockedGuestAction(): void {
    // `panelClass` opts this toast into the larger notification styling defined
    // globally in styles.scss (snackbars render in an overlay outside component
    // style encapsulation, so it can't be scoped here).
    this.snackBar.open(GUEST_LOCKED_MESSAGE, 'Dismiss', {
      duration: 6000,
      panelClass: 'guest-locked-snackbar',
    });
  }

  /**
   * Clear the confirmation and go back to the picker to start a fresh guest
   * document. Each guest document deliberately begins from a blank form (we don't
   * persist `from` or anything else across guest documents — see the guest flow
   * in docs/architecture.md), and the picker is where a type is chosen.
   */
  protected startAnotherGuestDocument(): void {
    this.guestResult.set(null);
    void this.router.navigate(['/']);
  }

  /** Saves a PDF blob to the user's downloads via a transient object URL. */
  private triggerDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  /** A readable download name, e.g. `invoice-2026-09-10.pdf`. */
  private guestFileName(type: DocumentType): string {
    const date = this.form.controls.date.value;
    const stamp = date ? toIsoDate(date) : toIsoDate(new Date());
    return `${type}-${stamp}.pdf`;
  }

  /** Maps the line-item FormArray to trimmed `LineItem`s, dropping empty optionals. */
  private buildLineItems(): LineItem[] {
    return this.form.getRawValue().items.map((item) => {
      const line: LineItem = {
        name: item.name.trim(),
        quantity: item.quantity ?? 0,
        unit_cost: item.unit_cost ?? 0,
      };
      const description = item.description.trim();
      if (description) {
        line.description = description;
      }
      const reference = item.reference.trim();
      if (reference) {
        line.reference = reference;
      }
      return line;
    });
  }

  /** Assembles the raw form values into a `CreateDocumentRequest`. */
  private buildRequest(type: DocumentType): CreateDocumentRequest {
    const raw = this.form.getRawValue();

    const body: CreateDocumentRequest = {
      type,
      to: raw.to.trim(),
      currency: raw.currency,
      // `date` passes the form's required validation, so it's non-null here.
      date: toIsoDate(raw.date!),
      items: this.buildLineItems(),
      tax_percent: raw.tax_percent ?? 0,
      discount_percent: raw.discount_percent ?? 0,
      shipping_amount: raw.shipping_amount ?? 0,
      // Harmless when the profile has no logo (the backend ignores it and stores
      // `logo_url: null` either way), so it's always safe to send the raw value.
      include_logo: raw.include_logo,
    };

    if (raw.customer_id) {
      body.customer_id = raw.customer_id;
    }
    const from = raw.from.trim();
    if (from) {
      body.from = from;
    }
    if (raw.due_date) {
      body.due_date = toIsoDate(raw.due_date);
    }
    const number = raw.number.trim();
    if (number) {
      body.number = number;
    }
    const related = raw.related_document_number.trim();
    if (related) {
      body.related_document_number = related;
    }
    const notes = raw.notes.trim();
    if (notes) {
      body.notes = notes;
    }
    const terms = raw.terms.trim();
    if (terms) {
      body.terms = terms;
    }

    return body;
  }

  /**
   * Assembles the raw form values into a `GuestCreateDocumentRequest`. Same shape
   * as {@link buildRequest} minus the two things a guest can't have: `customer_id`
   * (no saved customers) and `include_logo` (no profile logo). `from` is required
   * for a guest and validated as such on the form, so it's always present here.
   */
  private buildGuestRequest(type: DocumentType): GuestCreateDocumentRequest {
    const raw = this.form.getRawValue();

    const body: GuestCreateDocumentRequest = {
      type,
      to: raw.to.trim(),
      from: raw.from.trim(),
      currency: raw.currency,
      // `date` passes the form's required validation, so it's non-null here.
      date: toIsoDate(raw.date!),
      items: this.buildLineItems(),
      tax_percent: raw.tax_percent ?? 0,
      discount_percent: raw.discount_percent ?? 0,
      shipping_amount: raw.shipping_amount ?? 0,
    };

    if (raw.due_date) {
      body.due_date = toIsoDate(raw.due_date);
    }
    const number = raw.number.trim();
    if (number) {
      body.number = number;
    }
    const related = raw.related_document_number.trim();
    if (related) {
      body.related_document_number = related;
    }
    const notes = raw.notes.trim();
    if (notes) {
      body.notes = notes;
    }
    const terms = raw.terms.trim();
    if (terms) {
      body.terms = terms;
    }

    return body;
  }

  private handleError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 422 && this.applyFieldErrors(error.error)) {
        return;
      }
      if (error.status === 429) {
        this.errorMessage.set('Too many requests — please try again shortly.');
        return;
      }
      if (error.status === 0) {
        this.errorMessage.set('Could not reach the server. Check your connection and try again.');
        return;
      }
    }
    this.errorMessage.set('Something went wrong while saving. Please try again.');
  }

  /**
   * Maps a 422 `ValidationErrorResponse` onto the matching form controls. The
   * backend's `error.fields[].field` names line up with our control names,
   * including array paths like `items[0].unit_cost` — rewritten to Angular's
   * `items.0.unit_cost` dot form for `form.get()`. Returns whether at least one
   * field error was applied (per docs/api-client.md, prefer this over a single
   * generic banner).
   */
  private applyFieldErrors(body: unknown): boolean {
    if (!isValidationErrorResponse(body)) {
      return false;
    }

    let applied = false;
    for (const field of body.error.fields) {
      if (!field.field) {
        continue;
      }
      const path = field.field.replace(/\[(\d+)\]/g, '.$1');
      const control = this.form.get(path);
      if (control) {
        control.setErrors({ server: field.message ?? 'Invalid value.' });
        applied = true;
      }
    }
    return applied;
  }
}

/**
 * Parses a `YYYY-MM-DD` string into a local `Date` (midnight local time), the
 * inverse of {@link toIsoDate}. Built from parts rather than `new Date(str)` to
 * avoid the UTC-parsing shift that would move the date a day in some timezones.
 */
function fromIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Formats a `Date` as a `YYYY-MM-DD` string in local time (no timezone shift). */
function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Turns an enum value like `credit_note` into `Credit Note` for display. */
function humanize(type: DocumentType): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function isValidationErrorResponse(body: unknown): body is ValidationErrorResponse {
  return (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as ValidationErrorResponse).error === 'object' &&
    Array.isArray((body as ValidationErrorResponse).error.fields)
  );
}

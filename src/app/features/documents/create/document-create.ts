import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';

import { CreateDocumentRequest } from '../../../api/models/create-document-request';
import { DocumentType } from '../../../api/models/document-type';
import { LineItem } from '../../../api/models/line-item';
import { ValidationErrorResponse } from '../../../api/models/validation-error-response';
import { AuthService } from '../../../core/auth.service';
import { DocumentService } from '../document.service';
import { DocumentTypeService } from '../document-type.service';

/** A short list of common ISO 4217 codes for the currency picker. */
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'NZD'] as const;

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
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './document-create.html',
  styleUrl: './document-create.scss',
})
export class DocumentCreate {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly documents = inject(DocumentService);
  private readonly documentTypes = inject(DocumentTypeService);

  protected readonly currencies = CURRENCIES;
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /** The document type chosen on the picker, from the `?type=` query param. */
  protected readonly type = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('type') as DocumentType | null)),
    { initialValue: null },
  );

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
  });

  constructor() {
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

  protected async submit(): Promise<void> {
    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
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
      const doc = await this.documents.create(this.buildRequest(type));
      // `justCreated` drives the one-time "generated!" banner on the detail page;
      // it rides in router navigation state so it doesn't appear on normal revisits.
      await this.router.navigate(['/documents', doc.id], { state: { justCreated: true } });
    } catch (error) {
      this.handleError(error);
    } finally {
      this.submitting.set(false);
    }
  }

  /** Assembles the raw form values into a `CreateDocumentRequest`. */
  private buildRequest(type: DocumentType): CreateDocumentRequest {
    const raw = this.form.getRawValue();

    const items: LineItem[] = raw.items.map((item) => {
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

    const body: CreateDocumentRequest = {
      type,
      to: raw.to.trim(),
      currency: raw.currency,
      // `date` passes the form's required validation, so it's non-null here.
      date: toIsoDate(raw.date!),
      items,
      tax_percent: raw.tax_percent ?? 0,
      discount_percent: raw.discount_percent ?? 0,
      shipping_amount: raw.shipping_amount ?? 0,
    };

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

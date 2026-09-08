import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

import { CreateCustomerRequest } from '../../../api/models/create-customer-request';
import { Customer } from '../../../api/models/customer';
import { UpdateCustomerRequest } from '../../../api/models/update-customer-request';
import { ValidationErrorResponse } from '../../../api/models/validation-error-response';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/confirm-dialog';
import { CustomerService } from '../customer.service';

/**
 * Create/edit form for a customer. Serves both `/customers/new` (create) and
 * `/customers/:id` (edit) — the presence of an `:id` route param flips it into
 * edit mode, where it prefills from `GET /customers/{id}` and submits via
 * `PATCH /customers/{id}` instead of `POST /customers`.
 *
 * Mirrors the document create form (see `document-create`): 422 responses map
 * onto the matching controls via `error.fields`, other failures show a generic
 * banner, and 401 is left to the auth interceptor (see docs/api-client.md).
 */
@Component({
  selector: 'app-customer-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './customer-form.html',
  styleUrl: './customer-form.scss',
})
export class CustomerForm {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly customers = inject(CustomerService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  protected readonly submitting = signal(false);
  protected readonly deleting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /** The `:id` route param — present only in edit mode. */
  protected readonly id = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? undefined)),
    { initialValue: undefined },
  );

  /** True when editing an existing customer, false on the create route. */
  protected readonly isEdit = computed(() => !!this.id());

  /**
   * The customer being edited — stays idle on the create route (id undefined).
   * `prefillFrom` seeds the form from it once the GET resolves.
   */
  private readonly source = this.customers.getResource(this.id);
  /** Guards the one-shot prefill so user edits aren't clobbered by a later emission. */
  private prefilled = false;

  /** Surfaces the initial load/error state of the edit fetch to the template. */
  protected readonly loading = computed(() => this.isEdit() && this.source.isLoading());
  protected readonly loadError = computed(() => this.isEdit() && !!this.source.error());

  protected readonly form = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', Validators.required),
    email: this.fb.nonNullable.control('', Validators.email),
    address: this.fb.nonNullable.control(''),
    phone: this.fb.nonNullable.control(''),
    notes: this.fb.nonNullable.control(''),
  });

  constructor() {
    // Edit mode: prefill from the fetched customer once its GET resolves.
    effect(() => {
      const customer = this.source.value();
      if (!customer || this.prefilled) {
        return;
      }
      this.prefilled = true;
      this.form.patchValue({
        name: customer.name ?? '',
        email: customer.email ?? '',
        address: customer.address ?? '',
        phone: customer.phone ?? '',
        notes: customer.notes ?? '',
      });
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

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      const id = this.id();
      if (id) {
        // Every field is optional on update, so sending the full form is fine
        // (see CustomerService.update) — no need to diff against the source.
        await this.customers.update(id, this.buildRequest());
        await this.router.navigate(['/customers']);
        this.snackBar.open('Customer updated.', 'Dismiss', { duration: 4000 });
      } else {
        await this.customers.create(this.buildRequest());
        await this.router.navigate(['/customers']);
        this.snackBar.open('Customer created.', 'Dismiss', { duration: 4000 });
      }
    } catch (error) {
      this.handleError(error);
    } finally {
      this.submitting.set(false);
    }
  }

  /**
   * "Delete" asks first (never a one-click destroy), then calls
   * `DELETE /customers/{id}` — a soft delete server-side — and returns to the
   * list with a confirmation snackbar. Only available in edit mode.
   */
  protected async confirmDelete(): Promise<void> {
    const id = this.id();
    if (!id || this.deleting()) {
      return;
    }

    const data: ConfirmDialogData = {
      title: 'Delete customer',
      message:
        'Delete this customer? They’ll disappear from your list and can no longer be ' +
        'picked when creating new documents. Documents you’ve already created from ' +
        'them are unaffected — their recipient details are a saved snapshot, not a ' +
        'live link.',
      confirmText: 'Delete',
      destructive: true,
    };
    const confirmed = await firstValueFrom(this.dialog.open(ConfirmDialog, { data }).afterClosed());
    if (!confirmed) {
      return;
    }

    this.deleting.set(true);
    try {
      await this.customers.delete(id);
      await this.router.navigate(['/customers']);
      this.snackBar.open('Customer deleted.', 'Dismiss', { duration: 4000 });
    } catch {
      this.snackBar.open('Could not delete the customer. Please try again.', 'Dismiss', {
        duration: 6000,
      });
    } finally {
      this.deleting.set(false);
    }
  }

  /**
   * Assembles the trimmed form values into a request. The create and update
   * request shapes are identical here (name plus the same optional fields), and
   * update accepts a subset, so one builder serves both. Optional fields are
   * only included when non-empty, matching the document form's approach.
   */
  private buildRequest(): CreateCustomerRequest & UpdateCustomerRequest {
    const raw = this.form.getRawValue();
    const body: CreateCustomerRequest & UpdateCustomerRequest = { name: raw.name.trim() };

    const email = raw.email.trim();
    if (email) {
      body.email = email;
    }
    const address = raw.address.trim();
    if (address) {
      body.address = address;
    }
    const phone = raw.phone.trim();
    if (phone) {
      body.phone = phone;
    }
    const notes = raw.notes.trim();
    if (notes) {
      body.notes = notes;
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
   * backend's `error.fields[].field` names line up with our control names.
   * Returns whether at least one field error was applied (per docs/api-client.md,
   * prefer this over a single generic banner).
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
      const control = this.form.get(field.field);
      if (control) {
        control.setErrors({ server: field.message ?? 'Invalid value.' });
        applied = true;
      }
    }
    return applied;
  }
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

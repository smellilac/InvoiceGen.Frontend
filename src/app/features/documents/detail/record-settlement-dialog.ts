import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Document } from '../../../api/models/document';
import { DocumentType } from '../../../api/models/document-type';
import { ValidationErrorResponse } from '../../../api/models/validation-error-response';
import { settlementActionLabel, settlementNoun } from '../../../shared/settlement';
import { DocumentService } from '../document.service';

/** Payload for {@link RecordSettlementDialog}. */
export interface RecordSettlementDialogData {
  /** The document to record against — needed for the settlement POST. */
  documentId: string;
  /**
   * The document's type, used only for the type-aware wording (payment vs
   * refund) — same direction distinction as the overdue badge. See
   * `shared/settlement`.
   */
  type: DocumentType | undefined;
}

/**
 * Dialog opened before `POST /documents/{id}/settlements`, modelled on
 * {@link SendDocumentDialog}: a single amount field plus a submit button, with
 * type-aware copy ("Record payment" for money-owed-to-you types, "Record
 * refund" for a `credit_note`).
 *
 * Unlike the send dialog — which just collects a body and lets the parent make
 * the call — this dialog OWNS the request so a `422` (the delta would push
 * `amount_settled` outside `[0, total]`) can be surfaced inline on the amount
 * input via the shared `error.fields` pattern (see docs/api-client.md), rather
 * than as a generic banner after the dialog has already closed. It closes with
 * the updated {@link Document} on success (`200`) so the caller can redraw the
 * totals from the response, or `undefined` on cancel.
 */
@Component({
  selector: 'app-record-settlement-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ actionLabel }}</h2>
    <mat-dialog-content>
      <p class="settlement-dialog-intro">
        Enter the {{ noun }} amount to record against this document. A negative
        number corrects a previous entry — there's no {{ noun }} history to edit
        individually.
      </p>
      <form [formGroup]="form" class="settlement-dialog-form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline">
          <mat-label>Amount</mat-label>
          <input
            matInput
            type="number"
            step="0.01"
            formControlName="amount"
            inputmode="decimal"
            required
          />
          @if (form.controls.amount.hasError('required')) {
            <mat-error>Enter an amount.</mat-error>
          } @else if (form.controls.amount.hasError('zero')) {
            <mat-error>Enter a non-zero amount.</mat-error>
          } @else if (form.controls.amount.hasError('server')) {
            <mat-error>{{ form.controls.amount.getError('server') }}</mat-error>
          }
        </mat-form-field>
        @if (genericError()) {
          <p class="settlement-dialog-error" role="alert">{{ genericError() }}</p>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [disabled]="submitting()" [mat-dialog-close]="undefined">
        Cancel
      </button>
      <button
        mat-flat-button
        color="primary"
        type="button"
        [disabled]="form.invalid || submitting()"
        (click)="submit()"
      >
        {{ actionLabel }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .settlement-dialog-intro {
      margin: 0 0 1rem;
      color: var(--mat-sys-on-surface-variant);
    }

    .settlement-dialog-form {
      display: flex;
      flex-direction: column;
    }

    .settlement-dialog-form mat-form-field {
      width: 100%;
    }

    .settlement-dialog-error {
      margin: 0;
      color: var(--mat-sys-error);
    }
  `,
})
export class RecordSettlementDialog {
  private readonly fb = inject(FormBuilder);
  private readonly documents = inject(DocumentService);
  private readonly dialogRef =
    inject<MatDialogRef<RecordSettlementDialog, Document | undefined>>(MatDialogRef);
  private readonly data = inject<RecordSettlementDialogData>(MAT_DIALOG_DATA);

  /** "Record payment" / "Record refund" — button and title copy. */
  protected readonly actionLabel = settlementActionLabel(this.data.type);
  /** "payment" / "refund" — inline copy. */
  protected readonly noun = settlementNoun(this.data.type);

  protected readonly submitting = signal(false);
  /** Non-422 failures shown in-dialog (the dialog stays open so the user can retry). */
  protected readonly genericError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    // Nullable so `required` catches an empty field; negatives are allowed
    // (they walk a previous over-entry back down), but zero is a no-op.
    amount: this.fb.control<number | null>(null, [Validators.required, nonZeroValidator]),
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      return;
    }
    const amount = this.form.getRawValue().amount;
    if (amount == null) {
      return;
    }

    this.submitting.set(true);
    this.genericError.set(null);
    try {
      const updated = await this.documents.recordSettlement(this.data.documentId, { amount });
      this.dialogRef.close(updated);
    } catch (error) {
      this.handleError(error);
    } finally {
      this.submitting.set(false);
    }
  }

  /**
   * A 422 lands on the amount input, never a banner (per the task and
   * docs/api-client.md); anything else becomes an in-dialog message so the user
   * can adjust and retry without losing what they typed.
   */
  private handleError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 422) {
        if (this.applyFieldErrors(error.error)) {
          return;
        }
        // A 422 with no per-field entry still belongs on the amount input, not a
        // banner — use whatever top-level message the body carries.
        const message = topLevelMessage(error.error);
        this.form.controls.amount.setErrors({ server: message ?? 'This amount is not allowed.' });
        return;
      }
      if (error.status === 0) {
        this.genericError.set('Could not reach the server. Check your connection and try again.');
        return;
      }
    }
    this.genericError.set('Could not record the ' + this.noun + '. Please try again.');
  }

  /**
   * Maps a 422 body's field errors onto the matching controls (here, `amount`).
   * Handles both shapes: the backend's live response is ASP.NET Core's
   * validation-problem `errors` map (`{ errors: { amount: [msg] } }`, from
   * `Results.ValidationProblem`), which is what actually comes over the wire;
   * the spec's/legacy `ValidationErrorResponse` (`error.fields[]`) is accepted
   * too so this keeps working if the backend's error contract is ever aligned
   * to the OpenAPI schema. Returns whether at least one control was flagged.
   */
  private applyFieldErrors(body: unknown): boolean {
    let applied = false;
    for (const [field, message] of fieldErrorEntries(body)) {
      const control = this.form.get(field);
      if (control) {
        control.setErrors({ server: message });
        applied = true;
      }
    }
    return applied;
  }
}

/**
 * Normalizes a 422 body into `[field, message]` pairs, tolerating both the
 * ASP.NET Core validation-problem `errors` map and the OpenAPI
 * `ValidationErrorResponse.error.fields` array.
 */
function fieldErrorEntries(body: unknown): Array<[string, string]> {
  if (typeof body !== 'object' || body === null) {
    return [];
  }

  // ASP.NET Core: { errors: { amount: ["message", ...] } } — the real shape.
  const errors = (body as { errors?: unknown }).errors;
  if (typeof errors === 'object' && errors !== null && !Array.isArray(errors)) {
    return Object.entries(errors as Record<string, unknown>)
      .map(([field, messages]): [string, string] => [
        field,
        (Array.isArray(messages) ? messages[0] : messages) ?? 'Invalid value.',
      ])
      .filter(([field]) => !!field);
  }

  // Legacy/OpenAPI: { error: { fields: [{ field, message }] } }.
  if (isValidationErrorResponse(body)) {
    return body.error.fields
      .filter((f) => !!f.field)
      .map((f): [string, string] => [f.field as string, f.message ?? 'Invalid value.']);
  }

  return [];
}

/** Rejects a present-but-zero amount; leaves emptiness to `Validators.required`. */
function nonZeroValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value == null || value === '') {
    return null;
  }
  return Number(value) === 0 ? { zero: true } : null;
}

/**
 * Best-effort human message from a 422 body — ProblemDetails `detail` (what the
 * backend actually sends), else its `title`, else the legacy `error.message`.
 * The generic `title` ("One or more validation errors occurred.") is skipped so
 * we don't show it in place of a real reason.
 */
function topLevelMessage(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) {
    return undefined;
  }
  const b = body as { detail?: unknown; title?: unknown; error?: { message?: unknown } };
  const candidates = [b.detail, b.error?.message, b.title];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim() && candidate !== GENERIC_VALIDATION_TITLE) {
      return candidate;
    }
  }
  return undefined;
}

/** ASP.NET Core's default validation-problem title — not a useful user message. */
const GENERIC_VALIDATION_TITLE = 'One or more validation errors occurred.';

function isValidationErrorResponse(body: unknown): body is ValidationErrorResponse {
  return (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as ValidationErrorResponse).error === 'object' &&
    Array.isArray((body as ValidationErrorResponse).error.fields)
  );
}

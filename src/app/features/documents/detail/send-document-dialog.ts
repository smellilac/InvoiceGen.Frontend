import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { SendDocumentRequest } from '../../../api/models/send-document-request';

/** Payload for {@link SendDocumentDialog}. */
export interface SendDocumentDialogData {
  /**
   * Email pre-filled into `to_email`, resolved from the document's linked
   * customer. Empty/absent when there's no linked customer or no email on file —
   * the user must then type one before Send is enabled.
   */
  prefillEmail?: string;
}

/**
 * Confirmation dialog opened before `POST /documents/{id}/send`. Collects the
 * recipient email (pre-filled from the linked customer when available, still
 * editable) and an optional free-text message, so the send request carries a
 * real body instead of being empty. The subject line is fixed by the backend
 * and not editable here — see the backend's `x-email-delivery-policy`.
 *
 * Closes with a {@link SendDocumentRequest} on confirm, or `undefined` on
 * cancel/backdrop/escape.
 */
@Component({
  selector: 'app-send-document-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>Send document</h2>
    <mat-dialog-content>
      <p class="send-dialog-intro">
        We'll email the PDF to this address. The subject line is set automatically.
      </p>
      <form [formGroup]="form" class="send-dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Recipient email</mat-label>
          <input
            matInput
            type="email"
            formControlName="to_email"
            autocomplete="email"
            required
          />
          @if (form.controls.to_email.hasError('required')) {
            <mat-error>An email address is required.</mat-error>
          } @else if (form.controls.to_email.hasError('email')) {
            <mat-error>Enter a valid email address.</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Message (optional)</mat-label>
          <textarea
            matInput
            formControlName="message"
            rows="3"
            placeholder="Add a short note to include in the email…"
          ></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="undefined">Cancel</button>
      <button
        mat-flat-button
        color="primary"
        type="button"
        [disabled]="form.invalid"
        (click)="confirm()"
      >
        Send
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .send-dialog-intro {
      margin: 0 0 1rem;
      color: var(--mat-sys-on-surface-variant);
    }

    .send-dialog-form {
      display: flex;
      flex-direction: column;
    }

    .send-dialog-form mat-form-field {
      width: 100%;
    }
  `,
})
export class SendDocumentDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef =
    inject<MatDialogRef<SendDocumentDialog, SendDocumentRequest | undefined>>(MatDialogRef);
  private readonly data = inject<SendDocumentDialogData>(MAT_DIALOG_DATA);

  protected readonly form = this.fb.nonNullable.group({
    to_email: [this.data.prefillEmail ?? '', [Validators.required, Validators.email]],
    message: [''],
  });

  protected confirm(): void {
    if (this.form.invalid) {
      return;
    }
    const { to_email, message } = this.form.getRawValue();
    const body: SendDocumentRequest = { to_email: to_email.trim() };
    const trimmedMessage = message.trim();
    if (trimmedMessage) {
      body.message = trimmedMessage;
    }
    this.dialogRef.close(body);
  }
}

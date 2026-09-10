import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { AuthService } from '../../core/auth.service';

/**
 * The phrase the user must type verbatim before the destructive button unlocks.
 * Exported so the profile page's tests can drive the flow without hard-coding it
 * in two places.
 */
export const DELETE_CONFIRM_PHRASE = 'DELETE';

/**
 * The account-deletion confirmation dialog, opened from the profile page's
 * "Danger Zone". Deleting an account is irreversible, so this is deliberately
 * awkward: the confirm button stays disabled until the user types
 * {@link DELETE_CONFIRM_PHRASE} exactly, making an accidental click impossible.
 *
 * Like {@link RecordSettlementDialog}, it OWNS the request (`DELETE /auth/me` via
 * `AuthService.deleteAccount()`) rather than delegating to the parent, so a
 * failure can be surfaced in-dialog and the dialog kept open with the account
 * intact — `AuthService` only clears local auth state on a successful `204`. It
 * closes with `true` on success (the caller then redirects to `/login`) or
 * `undefined` on cancel.
 */
@Component({
  selector: 'app-delete-account-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>Delete your account?</h2>
    <mat-dialog-content>
      <p class="delete-account-warning">
        This permanently deletes your account. All your documents, customers, and
        profile data are deleted immediately, and you'll be signed out on every
        device.
      </p>
      <p class="delete-account-warning delete-account-warning-strong">
        This cannot be undone.
      </p>
      <p class="delete-account-prompt">
        Type <strong>{{ phrase }}</strong> below to confirm.
      </p>
      <form (ngSubmit)="confirm()">
        <mat-form-field appearance="outline" class="delete-account-field">
          <mat-label>Confirmation</mat-label>
          <input
            matInput
            [formControl]="confirmation"
            autocomplete="off"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            [attr.aria-label]="'Type ' + phrase + ' to confirm'"
          />
        </mat-form-field>
      </form>
      @if (errorMessage()) {
        <p class="delete-account-error" role="alert">{{ errorMessage() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [disabled]="deleting()" [mat-dialog-close]="undefined">
        Cancel
      </button>
      <button
        mat-flat-button
        color="warn"
        type="button"
        [disabled]="!canDelete()"
        (click)="confirm()"
      >
        Delete my account
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .delete-account-warning {
      margin: 0 0 0.75rem;
      color: var(--mat-sys-on-surface-variant);
    }

    .delete-account-warning-strong {
      color: var(--mat-sys-error);
      font: var(--mat-sys-title-small);
    }

    .delete-account-prompt {
      margin: 0 0 0.5rem;
    }

    .delete-account-field {
      width: 100%;
    }

    .delete-account-error {
      margin: 0;
      color: var(--mat-sys-error);
    }
  `,
})
export class DeleteAccountDialog {
  private readonly auth = inject(AuthService);
  private readonly dialogRef =
    inject<MatDialogRef<DeleteAccountDialog, boolean | undefined>>(MatDialogRef);

  protected readonly phrase = DELETE_CONFIRM_PHRASE;

  protected readonly deleting = signal(false);
  /** In-dialog failure message; the dialog stays open so the user can retry. */
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly confirmation = new FormControl('', { nonNullable: true });

  /**
   * The typed phrase as a signal (the app is zoneless, so the template can't read
   * `confirmation.value` reactively on each keystroke). The confirm button unlocks
   * only on an exact, trimmed match — and never mid-request.
   */
  private readonly confirmationValue = toSignal(this.confirmation.valueChanges, {
    initialValue: this.confirmation.value,
  });
  protected readonly canDelete = computed(
    () => this.confirmationValue().trim() === this.phrase && !this.deleting(),
  );

  protected async confirm(): Promise<void> {
    if (!this.canDelete()) {
      return;
    }

    this.deleting.set(true);
    this.errorMessage.set(null);
    try {
      await this.auth.deleteAccount();
      this.dialogRef.close(true);
    } catch {
      // Any failure leaves the account (and local auth state) intact — the user
      // is still signed in and can close the dialog or try again.
      this.errorMessage.set('Could not delete your account. Please try again.');
    } finally {
      this.deleting.set(false);
    }
  }
}

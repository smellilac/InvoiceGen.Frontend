import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

import { DocumentType } from '../../../api/models/document-type';
import { SendDocumentRequest } from '../../../api/models/send-document-request';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/confirm-dialog';
import { MoneyPipe } from '../../../shared/currency.pipe';
import { CustomerService } from '../../customers/customer.service';
import { documentTypeNames } from '../document-type-display';
import { DocumentService } from '../document.service';
import { DocumentTypeService } from '../document-type.service';
import { SendDocumentDialog, SendDocumentDialogData } from './send-document-dialog';

/** How long to wait after queuing a send before re-fetching `last_send_status`. */
const SEND_STATUS_POLL_MS = 3000;

/**
 * Document detail view (route `/documents/:id`). Shows the server-computed
 * `Document` — subtotal/tax/total are rendered exactly as the backend returned
 * them, never recomputed — with Download PDF and Send actions.
 *
 * Send follows the flow in docs/architecture.md: `POST /documents/{id}/send`
 * returns `202` (queued, NOT delivered), so we don't claim "Sent!"; we re-fetch
 * a few seconds later and surface a failure via `MatSnackBar` with
 * `last_send_error`.
 */
@Component({
  selector: 'app-document-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MoneyPipe,
  ],
  templateUrl: './document-detail.html',
  styleUrl: './document-detail.scss',
})
export class DocumentDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly documents = inject(DocumentService);
  private readonly customers = inject(CustomerService);
  private readonly documentTypes = inject(DocumentTypeService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  protected readonly id = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? undefined)),
    { initialValue: undefined },
  );

  /** The document being viewed — see `DocumentService.getResource`. */
  protected readonly doc = this.documents.getResource(this.id);

  /** Canonical type-to-label lookup from `/document-types` (same as picker/list). */
  private readonly types = this.documentTypes.list();
  private readonly typeNames = computed(() => documentTypeNames(this.types.value()));

  protected readonly sending = signal(false);
  protected readonly downloading = signal(false);
  protected readonly deleting = signal(false);

  /**
   * Shows the one-time "generated!" banner. Only true right after creation — the
   * create form navigates here with `state: { justCreated: true }`; a normal
   * revisit (e.g. from the history list) carries no such flag.
   */
  protected readonly showCreatedBanner = signal(false);

  /** Last `last_send_error` we alerted on, to avoid re-toasting the same failure. */
  private lastNotifiedError: string | null = null;

  constructor() {
    const state = (this.router.getCurrentNavigation()?.extras.state ?? history.state) as
      | { justCreated?: boolean }
      | null;
    if (state?.justCreated) {
      this.showCreatedBanner.set(true);
      // Strip the flag from the history entry so a refresh or back-navigation to
      // this page doesn't re-trigger the banner.
      const cleaned = { ...(history.state ?? {}) };
      delete cleaned['justCreated'];
      history.replaceState(cleaned, '');
    }

    // A failed send shows up as `last_send_status === 'failed'` after a re-fetch;
    // surface it once, per docs/architecture.md.
    effect(() => {
      const document = this.doc.value();
      if (document?.last_send_status === 'failed') {
        const message = document.last_send_error ?? 'The document could not be sent.';
        if (message !== this.lastNotifiedError) {
          this.lastNotifiedError = message;
          this.snackBar.open(message, 'Dismiss', { duration: 8000 });
        }
      }
    });
  }

  /**
   * The document type's canonical display label (`DocumentTypeInfo.name`, the same
   * source the picker and list use). Falls back to a humanized enum value while
   * `/document-types` is still loading or if the type is unknown.
   */
  protected nameFor(type: DocumentType | undefined): string {
    if (!type) {
      return 'Document';
    }
    return this.typeNames().get(type) ?? this.humanize(type);
  }

  /** Humanizes an enum value (e.g. `credit_note` -> `Credit Note`) as a fallback. */
  private humanize(type: DocumentType): string {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  protected dismissBanner(): void {
    this.showCreatedBanner.set(false);
  }

  protected async download(): Promise<void> {
    const id = this.id();
    if (!id || this.downloading()) {
      return;
    }
    this.downloading.set(true);
    try {
      const blob = await this.documents.downloadPdf(id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${this.doc.value()?.number ?? 'document'}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      this.snackBar.open('Could not download the PDF. Please try again.', 'Dismiss', {
        duration: 6000,
      });
    } finally {
      this.downloading.set(false);
    }
  }

  protected async send(): Promise<void> {
    const id = this.id();
    const document = this.doc.value();
    if (!id || !document || this.sending()) {
      return;
    }

    // Pre-fill the recipient from the linked customer's saved email when we can.
    // If there's no linked customer (or the lookup fails), the dialog requires
    // the user to type one before its Send button enables.
    const prefillEmail = await this.resolveCustomerEmail(document.customer_id);
    const body = await firstValueFrom(
      this.dialog
        .open<SendDocumentDialog, SendDocumentDialogData, SendDocumentRequest | undefined>(
          SendDocumentDialog,
          { data: { prefillEmail }, width: '480px' },
        )
        .afterClosed(),
    );
    if (!body) {
      // Dialog cancelled/dismissed.
      return;
    }

    this.sending.set(true);
    try {
      await this.documents.send(id, body);
      // 202 means queued, not delivered — don't claim success here.
      this.snackBar.open('Send queued. Checking status…', 'Dismiss', { duration: 4000 });
      // Re-fetch shortly to pick up last_send_status (the effect handles failures).
      setTimeout(() => this.doc.reload(), SEND_STATUS_POLL_MS);
    } catch (error) {
      this.snackBar.open(this.sendErrorMessage(error), 'Dismiss', { duration: 6000 });
    } finally {
      this.sending.set(false);
    }
  }

  /**
   * Resolves the linked customer's saved email to pre-fill the send dialog.
   * Returns `undefined` when there's no linked customer, the customer has no
   * email on file, or the lookup fails — in every case the dialog simply starts
   * empty and requires the user to enter an address.
   */
  private async resolveCustomerEmail(
    customerId: string | null | undefined,
  ): Promise<string | undefined> {
    if (!customerId) {
      return undefined;
    }
    try {
      const customer = await this.customers.get(customerId);
      return customer.email ?? undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Turns a failed send into a user-facing message. The dialog now requires a
   * valid email, so a `422` (`recipient_unresolved` / invalid `to_email`) should
   * be rare — but if it or any other error occurs, surface the backend's own
   * message rather than a generic string, falling back to a generic one only
   * when the response carries none.
   */
  private sendErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 429) {
        return 'Too many send attempts. Please try again shortly.';
      }
      const backendMessage = error.error?.error?.message;
      if (typeof backendMessage === 'string' && backendMessage.trim()) {
        return backendMessage;
      }
    }
    return 'Could not send the document. Please try again.';
  }

  /**
   * "Edit" opens the create form pre-filled from this document. The backend has no
   * PATCH for documents (see docs/architecture.md — Phase 1), so this is done as a
   * copy-and-replace: submitting there `POST`s a corrected copy and then
   * soft-deletes this original, so the net effect to the user is an in-place edit —
   * only the corrected version remains in the list. We pass the type up front (so
   * the form's heading and credit-note logic work synchronously) and a
   * `duplicateFrom` id the create form resolves by fetching `GET /documents/{id}`
   * and mapping it onto the form.
   */
  protected edit(): void {
    const document = this.doc.value();
    const id = this.id();
    if (!document || !id) {
      return;
    }
    this.router.navigate(['/documents/new'], {
      queryParams: { type: document.type, duplicateFrom: id },
    });
  }

  /**
   * "Delete" asks first (never a one-click destroy), then calls
   * `DELETE /documents/{id}` — a soft delete server-side — and returns to the list
   * with a confirmation snackbar.
   */
  protected async confirmDelete(): Promise<void> {
    const id = this.id();
    if (!id || this.deleting()) {
      return;
    }

    const data: ConfirmDialogData = {
      title: 'Delete document',
      message: 'Delete this document? It will be removed from your history.',
      confirmText: 'Delete',
      destructive: true,
    };
    const confirmed = await firstValueFrom(
      this.dialog.open(ConfirmDialog, { data }).afterClosed(),
    );
    if (!confirmed) {
      return;
    }

    this.deleting.set(true);
    try {
      await this.documents.delete(id);
      await this.router.navigate(['/documents']);
      this.snackBar.open('Document deleted.', 'Dismiss', { duration: 4000 });
    } catch {
      this.snackBar.open('Could not delete the document. Please try again.', 'Dismiss', {
        duration: 6000,
      });
    } finally {
      this.deleting.set(false);
    }
  }
}

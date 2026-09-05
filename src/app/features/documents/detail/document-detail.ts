import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, RouterLink } from '@angular/router';

/**
 * Stub for the document detail view (route `/documents/:id`). The real view
 * (summary, Download PDF, Send Email — see docs/architecture.md) isn't built
 * yet; this exists so the history list's row navigation is wired end to end,
 * same pattern as the create stub. It just echoes the document id.
 */
@Component({
  selector: 'app-document-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatCardModule, RouterLink],
  template: `
    <main class="detail-page">
      <mat-card appearance="outlined" class="detail-card">
        <mat-card-header>
          <mat-card-title>Document</mat-card-title>
          @if (id; as documentId) {
            <mat-card-subtitle>ID: {{ documentId }}</mat-card-subtitle>
          }
        </mat-card-header>
        <mat-card-content>
          <p>The detail view for this document is coming soon.</p>
        </mat-card-content>
        <mat-card-actions>
          <a mat-stroked-button routerLink="/documents">Back to documents</a>
        </mat-card-actions>
      </mat-card>
    </main>
  `,
  styles: `
    .detail-page {
      display: flex;
      justify-content: center;
      padding: 2rem 1rem;
    }

    .detail-card {
      width: 100%;
      max-width: 32rem;
    }
  `,
})
export class DocumentDetail {
  private readonly route = inject(ActivatedRoute);

  /** The document id from the `/documents/:id` route param. */
  protected readonly id = this.route.snapshot.paramMap.get('id');
}

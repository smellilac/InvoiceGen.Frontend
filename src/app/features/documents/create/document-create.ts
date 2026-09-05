import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, RouterLink } from '@angular/router';

/**
 * Stub for the document create form (route `/documents/new?type=<id>`). The real
 * Reactive Form isn't built yet — this exists so the picker's navigation is
 * wired end to end. It just echoes the selected type. Replace with the create
 * form when the documents feature lands (see docs/architecture.md).
 */
@Component({
  selector: 'app-document-create',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatCardModule, RouterLink],
  template: `
    <main class="create-page">
      <mat-card appearance="outlined" class="create-card">
        <mat-card-header>
          <mat-card-title>New document</mat-card-title>
          @if (type(); as t) {
            <mat-card-subtitle>Type: {{ t }}</mat-card-subtitle>
          }
        </mat-card-header>
        <mat-card-content>
          <p>The create form for this document type is coming soon.</p>
        </mat-card-content>
        <mat-card-actions>
          <a mat-stroked-button routerLink="/">Back to document types</a>
        </mat-card-actions>
      </mat-card>
    </main>
  `,
  styles: `
    .create-page {
      display: flex;
      justify-content: center;
      padding: 2rem 1rem;
    }

    .create-card {
      width: 100%;
      max-width: 32rem;
    }
  `,
})
export class DocumentCreate {
  private readonly route = inject(ActivatedRoute);

  /** The document type chosen on the picker, from the `?type=` query param. */
  protected readonly type = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('type'))),
    { initialValue: null },
  );
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth.service';
import { Logo } from '../../../shared/logo';
import { documentTypeIcon } from '../document-type-display';
import { DocumentTypeService } from '../document-type.service';

/**
 * First screen after login (route `/`). Lists the document types the backend
 * offers as tiles; picking one navigates toward the (not-yet-built) create form
 * at `/documents/new?type=<id>`. Loading, error, and empty states are all
 * handled — see docs/architecture.md for where this sits in the routing map.
 */
@Component({
  selector: 'app-document-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    Logo,
  ],
  templateUrl: './document-picker.html',
  styleUrl: './document-picker.scss',
})
export class DocumentPicker {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly documentTypes = inject(DocumentTypeService);

  protected readonly types = this.documentTypes.list();

  /** Resolves a backend icon identifier to a Material Symbols icon name. */
  protected readonly iconFor = documentTypeIcon;

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}

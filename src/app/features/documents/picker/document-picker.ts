import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';

import { DocumentType } from '../../../api/models/document-type';
import { documentTypeDescription, documentTypeIcon } from '../document-type-display';
import { DocumentTypeService } from '../document-type.service';

/**
 * First screen after login (route `/`). Lists the document types the backend
 * offers as tiles; picking one navigates to the create form at
 * `/documents/new?type=<id>`. Loading, error, and empty states are all handled —
 * see docs/architecture.md for where this sits in the routing map.
 *
 * When reached from a customer's detail page ("Create document for this
 * customer"), a `?customerId=<id>` param rides along and is forwarded onto each
 * type card's link, so the create form can link that customer automatically.
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
  ],
  templateUrl: './document-picker.html',
  styleUrl: './document-picker.scss',
})
export class DocumentPicker {
  private readonly documentTypes = inject(DocumentTypeService);
  private readonly route = inject(ActivatedRoute);

  protected readonly types = this.documentTypes.list();

  /** Optional customer carried in from a customer's detail page (`?customerId=`). */
  private readonly customerId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('customerId') ?? undefined)),
    { initialValue: undefined },
  );

  /** Resolves a backend icon identifier to a Material Symbols icon name. */
  protected readonly iconFor = documentTypeIcon;

  /** Resolves a document type id to its picker card blurb. */
  protected readonly descriptionFor = documentTypeDescription;

  /**
   * Query params for a type card's link to the create form — the chosen `type`,
   * plus `customerId` forwarded through when the picker was opened for a specific
   * customer.
   */
  protected queryParamsFor(type: DocumentType | undefined): Record<string, string> {
    const params: Record<string, string> = {};
    if (type) {
      params['type'] = type;
    }
    const customerId = this.customerId();
    if (customerId) {
      params['customerId'] = customerId;
    }
    return params;
  }
}

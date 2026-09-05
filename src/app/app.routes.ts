import { Routes } from '@angular/router';

import { AUTH_ROUTES } from './features/auth/auth.routes';
import { DOCUMENTS_ROUTES } from './features/documents/documents.routes';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  ...AUTH_ROUTES,
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/documents/picker/document-picker').then((m) => m.DocumentPicker),
  },
  ...DOCUMENTS_ROUTES,
  { path: '**', redirectTo: '' },
];

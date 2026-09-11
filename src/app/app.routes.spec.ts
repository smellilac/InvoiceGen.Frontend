import { Route } from '@angular/router';

import { routes } from './app.routes';
import { authGuard } from './core/auth.guard';
import { MainLayout } from './shared/main-layout';

/**
 * Structural guard on the route table after the guest rework. Rather than driving
 * a full router navigation (which would load every real feature component), these
 * assertions read the config directly to lock in the one thing the rework is
 * about: which paths sit behind {@link authGuard} and which are public. The
 * guard's own redirect behaviour is covered in `core/auth.guard.spec.ts`.
 */
describe('app routes (public vs guarded wiring)', () => {
  /** The MainLayout shell hosting the picker, the guest form, and the guarded subtree. */
  const shell = routes.find((r) => r.component === MainLayout)!;
  const shellChildren = shell.children ?? [];

  /** The componentless empty-path group carrying the auth guard. */
  const guardedGroup = shellChildren.find(
    (r) => r.path === '' && r.canActivate?.includes(authGuard),
  )!;
  const guardedPaths = (guardedGroup?.children ?? []).map((r) => r.path);

  function isTopLevelPublic(path: string): boolean {
    const route = routes.find((r) => r.path === path);
    return !!route && !route.canActivate;
  }

  it('keeps the auth, help, and legal pages public at the top level', () => {
    for (const path of ['login', 'register', 'help', 'terms', 'privacy']) {
      expect(isTopLevelPublic(path)).toBe(true);
    }
  });

  it('exposes the shell itself without a guard', () => {
    expect(shell).toBeDefined();
    expect(shell.canActivate).toBeUndefined();
  });

  it('leaves the document picker and the creation form public', () => {
    const picker = shellChildren.find((r) => r.path === '' && r.loadComponent);
    const createForm = shellChildren.find((r) => r.path === 'documents/new');

    expect(picker).toBeDefined();
    expect(picker!.canActivate).toBeUndefined();

    expect(createForm).toBeDefined();
    expect(createForm!.canActivate).toBeUndefined();

    // The public create form must NOT be duplicated inside the guarded subtree.
    expect(guardedPaths).not.toContain('documents/new');
  });

  it('keeps history, document detail, customers, and profile behind the guard', () => {
    expect(guardedGroup).toBeDefined();
    for (const path of ['documents', 'documents/:id', 'customers', 'profile']) {
      expect(guardedPaths).toContain(path);
    }
  });

  it('falls back to the public picker for unknown URLs (not /login)', () => {
    const wildcard = shellChildren.find((r: Route) => r.path === '**');
    expect(wildcard?.redirectTo).toBe('');
    expect(wildcard?.canActivate).toBeUndefined();
  });
});

import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

/**
 * The guard behind every account-linked route. Unchanged by the guest rework, but
 * still the thing that must keep sending a signed-out visitor to /login when they
 * reach a protected page — so these tests pin exactly that, plus the happy path.
 */
describe('authGuard', () => {
  function run(isAuthenticated: boolean, url = '/documents') {
    const restoreSession = vi.fn().mockResolvedValue(undefined);
    const createUrlTree = vi.fn().mockReturnValue('LOGIN_URL_TREE');

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { restoreSession, isAuthenticated: () => isAuthenticated } },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url } as never),
    );
    return { result, restoreSession, createUrlTree };
  }

  it('waits for session restore, then allows an authenticated user through', async () => {
    const { result, restoreSession, createUrlTree } = run(true);

    await expect(result).resolves.toBe(true);
    expect(restoreSession).toHaveBeenCalledTimes(1);
    expect(createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects an unauthenticated user to /login, preserving the attempted URL', async () => {
    const { result, createUrlTree } = run(false, '/customers/42');

    await expect(result).resolves.toBe('LOGIN_URL_TREE');
    expect(createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/customers/42' },
    });
  });
});

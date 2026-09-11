import { TestBed } from '@angular/core/testing';

import { GUEST_FREE_DOCUMENT_LIMIT, GuestAttemptsService } from './guest-attempts.service';

/**
 * Unit coverage for the soft, client-side guest limit. The service is a thin
 * wrapper over a localStorage counter, so these tests pin the behaviour the
 * document form depends on: it starts at the full limit, only a recorded success
 * decrements it, the count persists across service instances (a reload), and it
 * never reports negative once exhausted.
 */
describe('GuestAttemptsService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  function create(): GuestAttemptsService {
    return TestBed.runInInjectionContext(() => new GuestAttemptsService());
  }

  it('starts with the full free-document limit', () => {
    const service = create();

    expect(service.remaining()).toBe(GUEST_FREE_DOCUMENT_LIMIT);
    expect(service.hasRemaining()).toBe(true);
  });

  it('decrements remaining only when a success is recorded', () => {
    const service = create();

    service.recordSuccess();
    expect(service.remaining()).toBe(GUEST_FREE_DOCUMENT_LIMIT - 1);

    service.recordSuccess();
    expect(service.remaining()).toBe(GUEST_FREE_DOCUMENT_LIMIT - 2);
  });

  it('bottoms out at zero and reports nothing remaining', () => {
    const service = create();

    for (let i = 0; i < GUEST_FREE_DOCUMENT_LIMIT + 2; i++) {
      service.recordSuccess();
    }

    expect(service.remaining()).toBe(0);
    expect(service.hasRemaining()).toBe(false);
  });

  it('persists the count across instances (survives a reload)', () => {
    const first = create();
    first.recordSuccess();

    // A fresh instance reads the same browser's stored count.
    const second = create();
    expect(second.remaining()).toBe(GUEST_FREE_DOCUMENT_LIMIT - 1);
  });

  it('treats a cleared/garbage store as no attempts used', () => {
    localStorage.setItem('invoiceapp.guest_documents_used', 'not-a-number');

    const service = create();
    expect(service.remaining()).toBe(GUEST_FREE_DOCUMENT_LIMIT);
  });
});

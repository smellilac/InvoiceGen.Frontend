import { TestBed } from '@angular/core/testing';

import { ConsentService } from './consent.service';

describe('ConsentService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function create(): ConsentService {
    TestBed.resetTestingModule();
    return TestBed.inject(ConsentService);
  }

  it('starts undecided when nothing is stored', () => {
    expect(create().choice()).toBeNull();
  });

  it('persists and reflects an accepted choice', () => {
    const service = create();
    service.accept();

    expect(service.choice()).toBe('accepted');
    expect(localStorage.getItem('cookie_consent')).toBe('accepted');
  });

  it('persists and reflects a declined choice', () => {
    const service = create();
    service.decline();

    expect(service.choice()).toBe('declined');
    expect(localStorage.getItem('cookie_consent')).toBe('declined');
  });

  it('restores a previously stored choice on a later visit', () => {
    localStorage.setItem('cookie_consent', 'accepted');

    expect(create().choice()).toBe('accepted');
  });

  it('ignores an unrecognized stored value', () => {
    localStorage.setItem('cookie_consent', 'maybe');

    expect(create().choice()).toBeNull();
  });
});

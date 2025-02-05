import { TestBed } from '@angular/core/testing';

import { MoodEntryService } from './mood-entry.service';

describe('MoodEntryService', () => {
  let service: MoodEntryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MoodEntryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

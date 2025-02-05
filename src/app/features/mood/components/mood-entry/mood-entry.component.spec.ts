import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoodEntryComponent } from './mood-entry.component';

describe('MoodEntryComponent', () => {
  let component: MoodEntryComponent;
  let fixture: ComponentFixture<MoodEntryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MoodEntryComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoodEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoodMapComponent } from './mood-map.component';

describe('MoodMapComponent', () => {
  let component: MoodMapComponent;
  let fixture: ComponentFixture<MoodMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MoodMapComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoodMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

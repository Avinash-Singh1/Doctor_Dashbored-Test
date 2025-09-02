import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NectarDayViewComponent } from './nectar-day-view.component';

describe('NectarDayViewComponent', () => {
  let component: NectarDayViewComponent;
  let fixture: ComponentFixture<NectarDayViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NectarDayViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NectarDayViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

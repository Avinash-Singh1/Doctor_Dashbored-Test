import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NectarMonthViewComponent } from './nectar-month-view.component';

describe('NectarMonthViewComponent', () => {
  let component: NectarMonthViewComponent;
  let fixture: ComponentFixture<NectarMonthViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NectarMonthViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NectarMonthViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

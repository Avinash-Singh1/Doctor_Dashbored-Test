import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NectarWeekViewComponent } from './nectar-week-view.component';

describe('NectarWeekViewComponent', () => {
  let component: NectarWeekViewComponent;
  let fixture: ComponentFixture<NectarWeekViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NectarWeekViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NectarWeekViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

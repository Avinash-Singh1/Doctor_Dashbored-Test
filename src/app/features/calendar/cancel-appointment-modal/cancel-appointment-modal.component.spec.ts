import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CancelAppointmentModalComponent } from './cancel-appointment-modal.component';

describe('CancelAppointmentModalComponent', () => {
  let component: CancelAppointmentModalComponent;
  let fixture: ComponentFixture<CancelAppointmentModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CancelAppointmentModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CancelAppointmentModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

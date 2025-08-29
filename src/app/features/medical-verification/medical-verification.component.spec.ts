import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MedicalVerificationComponent } from './medical-verification.component';

describe('MedicalVerificationComponent', () => {
  let component: MedicalVerificationComponent;
  let fixture: ComponentFixture<MedicalVerificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MedicalVerificationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MedicalVerificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

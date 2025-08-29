import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyPatientComponent } from './my-patient.component';

describe('MyPatientComponent', () => {
  let component: MyPatientComponent;
  let fixture: ComponentFixture<MyPatientComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyPatientComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyPatientComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

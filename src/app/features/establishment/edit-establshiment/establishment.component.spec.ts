import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstablishmentComponent2 } from './establishment2.component';

describe('EstablishmentComponent', () => {
  let component: EstablishmentComponent2;
  let fixture: ComponentFixture<EstablishmentComponent2>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EstablishmentComponent2]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstablishmentComponent2);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

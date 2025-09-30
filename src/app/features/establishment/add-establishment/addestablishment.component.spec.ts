import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddEstablishmentComponent } from './addestablishment.component'; 

describe('EstablishmentComponent', () => {
  let component: AddEstablishmentComponent;
  let fixture: ComponentFixture<AddEstablishmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddEstablishmentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddEstablishmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

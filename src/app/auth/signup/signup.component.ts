import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl, ValidationErrors, AbstractControl } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent implements OnInit {
  signupForm!: FormGroup;
  otpForm!: FormGroup;

  // toggle visibility
  isPasswordVisible1 = false;
  isPasswordVisible2 = false;

  // fake dropdown lists (replace with API later)
  specializationList = [
    { _id: '1', name: 'Cardiologist' },
    { _id: '2', name: 'Dermatologist' },
    { _id: '3', name: 'Pediatrician' }
  ];
  states = [
    { name: 'Delhi', cities: ['New Delhi', 'Dwarka'] },
    { name: 'Maharashtra', cities: ['Mumbai', 'Pune'] }
  ];
  cities: any[] = [];
  isCityDisabled = true;

  experinenceYear: { label: string; value: string }[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,  
    @Inject(DOCUMENT) public document: any
  ) {
    this.generateExperienceYears();
  }

  ngOnInit(): void {
    this.initializeSignupForm();
    this.initializeOtpForm();
  }

  generateExperienceYears() {
    for (let i = 1; i <= 50; i++) {
      this.experinenceYear.push({ label: `${i} Years of Experience`, value: i.toString() });
    }
  }

  initializeSignupForm() {
    this.signupForm = this.fb.group({
      title: ['', Validators.required],
      name: ['', [Validators.required, Validators.minLength(3)]],
      gender: ['', Validators.required],
      specialization: ['', Validators.required],
      yearsOfExperience: ['', Validators.required],
      education: this.fb.group({
        degree: ['', Validators.required],
        college: ['', Validators.required],
        year: ['', [Validators.required, this.futureYearValidator]]
      }),
      state: ['', Validators.required],
      city: [{ value: '' }, Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      emailAddress: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required, this.passwordMatchValidator.bind(this)]],
      consent: [false, Validators.requiredTrue]
    });
  }

  initializeOtpForm() {
    this.otpForm = this.fb.group({
      otpCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }

  togglePasswordVisibilityconfirm1() {
    this.isPasswordVisible1 = !this.isPasswordVisible1;
  }
  togglePasswordVisibilityconfirm2() {
    this.isPasswordVisible2 = !this.isPasswordVisible2;
  }

  passwordMatchValidator(control: FormControl): ValidationErrors | null {
    const password = this.signupForm?.get('password')?.value;
    if (password !== control.value) {
      return { mismatch: true };
    }
    return null;
  }

  futureYearValidator(control: AbstractControl): ValidationErrors | null {
    const currentYear = new Date().getFullYear();
    const year = Number(control.value);
    if (!/^\d+$/.test(control.value)) {
      return { invalidYear: 'Only numeric values are allowed' };
    }
    if (year < 1900 || year > currentYear) {
      return { invalidYear: `Year must be between 1900 and ${currentYear}` };
    }
    return null;
  }


    onStateChange(event: Event) {
      const select = event.target as HTMLSelectElement; // ✅ type cast
      const stateName = select.value;

      const state = this.states.find(s => s.name === stateName);
      this.cities = state ? state.cities : [];

      if (this.cities.length > 0) {
        this.signupForm.get('city')?.enable();
      } else {
        this.signupForm.get('city')?.disable();
        this.signupForm.get('city')?.reset();
      }
    }



  onSubmit() {
    // if (this.signupForm.invalid) {
    //   this.signupForm.markAllAsTouched();
    //   return;
    // }
    console.log('Doctor Signup Payload:', this.signupForm.value);
    this.openModal('otpModal');
  }


onVerifyOtp() {
  if (this.otpForm.invalid) {
    this.otpForm.markAllAsTouched();
    return;
  }

  console.log('OTP Submitted:', this.otpForm.value);

  this.closeModal('otpModal');

  // ✅ redirect to login page
  this.router.navigate(['/auth/login']);
}

  // modal helpers
  openModal(modalId: string) {
    const el = document.getElementById(modalId);
    if (el) {
      el.classList.add('show', 'd-block');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('role', 'dialog');
    }
  }

  closeModal(modalId: string) {
    const el = document.getElementById(modalId);
    if (el) {
      el.classList.remove('show', 'd-block');
      el.removeAttribute('aria-modal');
      el.removeAttribute('role');
    }
  }
}

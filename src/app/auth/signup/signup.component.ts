// src/app/auth/signup/signup.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, HttpClientModule],
   templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent implements OnInit {
  signupForm!: FormGroup;
  otpForm!: FormGroup;

  isCityDisabled = false;
  isPasswordVisible1 = false;
  isPasswordVisible2 = false;

   specializationList = [
  { "_id": "65716eda1eece2ff479fba57", "name": "Cardiologist" },
  { "_id": "65716eda1eece2ff479fba58", "name": "Dermatologist" },
  { "_id": "65716eda1eece2ff479fba59", "name": "Pediatrician" }
]
  experinenceYear: any[] = [
    { value: '0', label: 'Fresher' },
    { value: '1', label: '1 year' },
    { value: '2', label: '2 years' },
    { value: '3', label: '3 years' },
    { value: '4', label: '4 years' },
    { value: '5', label: '5+ years' },
  ];
  states: any[] = [
    { name: 'Bihar' },
    { name: 'Karnataka' },
    // add more
  ];
  cities: string[] = [];

  // API endpoints (update as required)
  private REGISTER_URL = 'http://82.112.237.181:3000/api/v1/register';
  private VERIFY_OTP_URL = 'http://82.112.237.181:3000/api/v1/verify-otp';

  constructor(private fb: FormBuilder, private http: HttpClient, private router: Router,) {}

  ngOnInit(): void {
    this.buildForm();
    this.buildOtpForm();
    // optionally fetch specializationList & states from backend here
  }

  private buildForm(): void {
    this.signupForm = this.fb.group(
      {
        title: [''],
        name: ['', [Validators.required]],
        gender: ['', [Validators.required]],
        specialization: ['', [Validators.required]],
        education: this.fb.group({
          degree: ['', Validators.required],
          college: ['', Validators.required],
          year: ['', Validators.required],
        }),
        yearsOfExperience: ['', Validators.required],
        state: ['', Validators.required],
        city: ['', Validators.required],
        phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
        emailAddress: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
        consent: [false, Validators.requiredTrue],
      },
      { validators: this.passwordsMatchValidator }
    );
  }

  private buildOtpForm(): void {
    this.otpForm = this.fb.group({
      otpCode: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(6)]],
    });
  }

  private passwordsMatchValidator(group: AbstractControl) {
    const pw = group.get('password')?.value;
    const cpw = group.get('confirmPassword')?.value;
    return pw === cpw ? null : { passwordsMismatch: true };
  }

  private getNameOrString(value: any): string {
    if (value == null || value === '') return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && 'name' in value) return value.name;
    return String(value);
  }

  private toProperCase(value: string): string {
    if (!value) return '';
    return value
      .toString()
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(' ');
  }

  togglePasswordVisibilityconfirm1() {
    this.isPasswordVisible1 = !this.isPasswordVisible1;
  }

  togglePasswordVisibilityconfirm2() {
    this.isPasswordVisible2 = !this.isPasswordVisible2;
  }

  onStateChange(event: any): void {
    const selectedState = event?.target?.value ?? this.signupForm.get('state')?.value;
    const cityMap: any = {
      Bihar: ['Patna', 'Gaya', 'Araria'],
      Karnataka: ['Bengaluru', 'Mysore', 'Mangalore'],
    };
    this.cities = cityMap[selectedState] ?? [];
    this.isCityDisabled = this.cities.length === 0;
    this.signupForm.get('city')?.setValue('');
  }

  openModal(id: string): void {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('show');
    (el as HTMLElement).style.display = 'block';
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    backdrop.id = `${id}_backdrop`;
    document.body.appendChild(backdrop);
    document.body.classList.add('modal-open');
  }

  closeModal(id: string): void {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('show');
    (el as HTMLElement).style.display = 'none';
    const backdrop = document.getElementById(`${id}_backdrop`);
    if (backdrop) backdrop.remove();
    document.body.classList.remove('modal-open');
  }

  onSubmit(): void {
    if (!this.signupForm) return;

    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      Swal.fire({ icon: 'error', title: 'Invalid form', text: 'Please fill all required fields correctly.' });
      return;
    }

    if (!this.signupForm.value.city) {
      Swal.fire({ icon: 'error', title: 'Missing City', text: 'Please select a city before submitting.' });
      return;
    }

    const title = this.signupForm.get('title')?.value || '';
    const name = this.signupForm.get('name')?.value || '';
    const fullName = `${this.toProperCase(title)} ${this.toProperCase(name)}`.trim();

    const rawState = this.signupForm.get('state')?.value;
    const rawCity = this.signupForm.get('city')?.value;

    const payload: any = {
      fullName: fullName || this.toProperCase(name),
      phone: this.signupForm.get('phoneNumber')?.value,
      userType: 2,
      countryCode: '+91',
      experience: this.signupForm.get('yearsOfExperience')?.value,
      gender: this.signupForm.get('gender')?.value,
      city: this.getNameOrString(rawCity),
      state: this.getNameOrString(rawState),
      email: this.signupForm.get('emailAddress')?.value,
      password: this.signupForm.get('password')?.value,
      specialization: this.signupForm.get('specialization')?.value,
      education: [
        {
          degree: this.signupForm.get('education.degree')?.value,
          college: this.signupForm.get('education.college')?.value,
          year: this.signupForm.get('education.year')?.value,
        },
      ],
    };

    Swal.fire({
      title: 'Creating account...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    this.http.post(this.REGISTER_URL, payload).subscribe({
      next: (res: any) => {
        Swal.close();
        const saved = { ...payload };
        delete saved.password;
        localStorage.setItem('signupForm', JSON.stringify(saved));
        localStorage.setItem('phone', payload.phone);

        Swal.fire({ icon: 'success', title: 'Registered', text: 'OTP sent to your phone.' }).then(() => {
          this.openModal('otpModal');
        });
      },
      error: (err: any) => {
        Swal.close();
        const message = err?.error?.message || 'Registration failed. Please try again.';
        Swal.fire({ icon: 'error', title: 'Error', text: message });
      },
    });
  }



// Add this helper to the component (near other helpers)
private getOrCreateDeviceId(): string {
  const key = 'deviceId';
  let id = localStorage.getItem(key);
  if (id) return id;

  // use crypto.randomUUID() when available, otherwise fallback to a simple UUID v4
  try {
    id = (window.crypto && (window.crypto as any).randomUUID) ? (window.crypto as any).randomUUID() : null;
  } catch (e) {
    id = null;
  }

  if (!id) {
    // fallback UUID v4 generator
    id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.floor(Math.random() * 16);
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  localStorage.setItem(key, id);
  return id;
}

onVerifyOtp(): void {
  if (!this.otpForm) return;

  if (this.otpForm.invalid) {
    this.otpForm.markAllAsTouched();
    Swal.fire({ icon: 'error', title: 'Invalid OTP', text: 'Please enter the OTP sent to your phone.' });
    return;
  }

  const otp = String(this.otpForm.get('otpCode')?.value || '').trim();
  const rawPhone = String(this.signupForm?.value?.phoneNumber || localStorage.getItem('phone') || '').trim();

  if (!rawPhone) {
    Swal.fire({ icon: 'error', title: 'Missing phone', text: 'Phone not found. Please retry signup.' });
    return;
  }

  const phoneClean = rawPhone.replace(/[-\s]/g, '');
  const deviceId = this.getOrCreateDeviceId();

  // basic device info
  const ua = navigator?.userAgent || null;
  const platform = navigator?.platform || null;

  const payload: any = {
    phone: phoneClean,
    otp,
    userType: 2, // doctor
    countryCode: '+91',
    deviceId,
    deviceType: 'web',
    deviceToken: null,
    browser: ua,
    os: platform,
    osVersion: null,
  };

  Swal.fire({
    title: 'Verifying OTP...',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  this.http.post(this.VERIFY_OTP_URL, payload).subscribe({
    next: (res: any) => {
      Swal.close();

      if (res && res.success) {
        // store auth token if backend returns it
        const token = res?.data?.token;
        if (token) localStorage.setItem('token', token);

        Swal.fire({ icon: 'success', title: 'Verified', text: 'Your phone number is verified.' }).then(() => {
          this.closeModal('otpModal');
          // navigate or further actions
           this.router.navigate(['/login']);

        });
        return;
      }

      // handle non-success response
      const msgCode = res?.msgCode || res?.message || 'OTP verification failed';
      Swal.fire({ icon: 'error', title: 'Verification failed', text: String(msgCode) });
    },
    error: (err: any) => {
      Swal.close();
      const body = err?.error || {};
      const serverMsgCode = body?.msgCode;

      if (serverMsgCode === 'INVALID_OTP') {
        Swal.fire({ icon: 'error', title: 'Invalid OTP', text: 'The OTP you entered is incorrect.' });
      } else if (serverMsgCode === 'EXPIRED_OTP') {
        Swal.fire({ icon: 'error', title: 'Expired OTP', text: 'The OTP has expired. Please request a new one.' });
      } else if (serverMsgCode === 'USER_NOT_FOUND') {
        Swal.fire({ icon: 'error', title: 'User not found', text: 'No user associated with this phone. Please sign up first.' });
      } else if (body?.msgCode === 'VALIDATION_ERROR' && body?.data?.message) {
        Swal.fire({ icon: 'error', title: 'Validation error', text: body.data.message });
      } else {
        const message = body?.message || err?.message || 'OTP verification failed. Please try again.';
        Swal.fire({ icon: 'error', title: 'Error', text: message });
      }
    },
  });
}



}

// src/app/auth/login/login.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';

import { AuthService } from '../../core/services/auth.service';  // adjust path if needed

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isPasswordVisible = false;
  loading = false;
  errorMessage = '';
  public otp: string = '';
  public ForgetNewPassword: any;
  public ForgetConfirmPassword: any;
  // used by [(ngModel)] in your template for forgot-password etc.
  public updatedValue = '';
  public profileId: any;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private auth: AuthService, // <-- use AuthService so BehaviorSubject updates immediately
    @Inject(DOCUMENT) public document: Document
  ) {}

  ngOnInit(): void {
    this.initializeLoginForm();
  }

  initializeLoginForm(): void {
    this.loginForm = this.fb.group({
      phoneOrEmail: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  isPasswordVisibleconfirm1 = false;
  togglePasswordVisibilityconfirm1() {
    this.isPasswordVisibleconfirm1 = !this.isPasswordVisibleconfirm1;
  }
  isPasswordVisibleconfirm2 = false;
  togglePasswordVisibilityconfirm2() {
    this.isPasswordVisibleconfirm2 = !this.isPasswordVisibleconfirm2;
  }

  togglePasswordVisibility() {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  private isEmail(value: string): boolean {
    if (!value) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value.trim());
  }

  private cleanPhone(value: string): string | null {
    if (!value) return null;
    const digits = value.replace(/\D/g, '');
    return digits.length > 5 ? digits : null; // require reasonable length
  }

  // Use AuthService's deviceId so it's consistent app-wide
  private generateDeviceId(): string {
    return this.auth.getOrCreateDeviceId();
  }

  private getDeviceType(): string {
    return /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  }

  private getBrowserName(): string {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('opr') || ua.includes('opera')) return 'opera';
    if (ua.includes('edg')) return 'edge';
    if (ua.includes('chrome')) return 'chrome';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';
    if (ua.includes('firefox')) return 'firefox';
    return 'unknown';
  }

  private getOsName(): string {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('windows')) return 'windows';
    if (ua.includes('mac')) return 'macos';
    if (ua.includes('android')) return 'android';
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    return 'unknown';
  }

  // onLogin(): void {
  //   if (this.loginForm.invalid) {
  //     this.loginForm.markAllAsTouched();
  //     return;
  //   }

  //   this.loading = true;
  //   this.errorMessage = '';

  //   const { phoneOrEmail, password } = this.loginForm.value as { phoneOrEmail: string; password: string };

  //   const payload: any = {
  //     password: String(password),
  //     userType: 2,
  //     countryCode: '+91',
  //     deviceId: this.generateDeviceId(),
  //     deviceToken: 'sampleDeviceToken',
  //     deviceType: this.getDeviceType(),
  //     browser: this.getBrowserName(),
  //     os: this.getOsName(),
  //   };

  //   const input = (phoneOrEmail || '').trim();

  //   if (this.isEmail(input)) {
  //     payload.email = input.toLowerCase();
  //   } else {
  //     const phoneClean = this.cleanPhone(input);
  //     if (phoneClean) {
  //       payload.phone = phoneClean;
  //     }
  //   }

  //   if (!payload.email && !payload.phone) {
  //     this.loading = false;
  //     this.errorMessage = 'Please enter a valid email or phone number.';
  //     return;
  //   }

  //   // Use AuthService.login so it handles setting session & updating subjects
  //   this.auth.login(payload).subscribe({
  //     next: (response: any) => {
  //       this.loading = false;

  //       // AuthService.login() already calls setSession() in a tap if login succeeded
  //       // but we still check response shape to decide navigation & show message
  //       if (response?.success) {
  //         Swal.fire({
  //           icon: 'success',
  //           title: 'Login Successful',
  //           text: 'Welcome back!',
  //           showConfirmButton: true,
  //           timer: 3000,
  //           timerProgressBar: true,
  //         }).then(() => {
  //           // navigate after the user dismisses toast
  //           this.router.navigate(['/medical-verification']);
  //         });
  //       } else {
  //         const serverMessage =
  //           response?.message || response?.data?.message || response?.msgCode || 'Login failed. Please try again.';
  //         this.errorMessage = serverMessage;
  //         Swal.fire({
  //           icon: 'error',
  //           title: 'Login Failed',
  //           text: serverMessage,
  //           showConfirmButton: true,
  //         });
  //       }
  //     },
  //     error: (err) => {
  //       this.loading = false;
  //       const e = err?.error ?? err;
  //       const serverMessage = e?.message || e?.data?.message || e?.msgCode || err?.message || 'Login failed. Please try again.';
  //       this.errorMessage = serverMessage;

  //       Swal.fire({
  //         icon: 'error',
  //         title: 'Login Failed',
  //         text: serverMessage,
  //         showConfirmButton: true,
  //       });

  //       console.error('Login error payload/response:', err);
  //     },
  //   });
  // }

  // Helpers for modals — use injected document
  
  onLogin(): void {
  if (this.loginForm.invalid) {
    this.loginForm.markAllAsTouched();
    return;
  }

  this.loading = true;
  this.errorMessage = '';

  const { phoneOrEmail, password } = this.loginForm.value as { phoneOrEmail: string; password: string };

  const payload: any = {
    password: String(password),
    userType: 2,
    countryCode: '+91',
    deviceId: this.generateDeviceId(),
    deviceToken: 'sampleDeviceToken',
    deviceType: this.getDeviceType(),
    browser: this.getBrowserName(),
    os: this.getOsName(),
  };

  const input = (phoneOrEmail || '').trim();

  if (this.isEmail(input)) {
    payload.email = input.toLowerCase();
  } else {
    const phoneClean = this.cleanPhone(input);
    if (phoneClean) {
      payload.phone = phoneClean;
    }
  }

  if (!payload.email && !payload.phone) {
    this.loading = false;
    this.errorMessage = 'Please enter a valid email or phone number.';
    return;
  }

  // Use AuthService.login so it handles setting session & updating subjects
  this.auth.login(payload).subscribe({
    next: (response: any) => {
      this.loading = false;

      // AuthService.login() already calls setSession() in a tap if login succeeded
      if (response?.success) {
        // show a non-blocking toast (no confirm button) and redirect after it closes
        Swal.fire({
          toast: true,
          position: 'top',
          icon: 'success',
          title: 'Login Successful',
          text: 'Welcome back!',
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
        }).then(() => {
          // navigate after toast disappears
          this.router.navigate(['/medical-verification']);
        });
      } else {
        const serverMessage =
          response?.message || response?.data?.message || response?.msgCode || 'Login failed. Please try again.';
        this.errorMessage = serverMessage;
        Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          text: serverMessage,
          showConfirmButton: true,
        });
      }
    },
    error: (err) => {
      this.loading = false;
      const e = err?.error ?? err;
      const serverMessage = e?.message || e?.data?.message || e?.msgCode || err?.message || 'Login failed. Please try again.';
      this.errorMessage = serverMessage;

      Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: serverMessage,
        showConfirmButton: true,
      });

      console.error('Login error payload/response:', err);
    },
  });
}

  openModal(modalId: string): void {
    const modalElement = this.document.getElementById(modalId);
    if (modalElement) {
      modalElement.classList.add('show', 'd-block');
      modalElement.setAttribute('aria-modal', 'true');
      modalElement.setAttribute('role', 'dialog');
    }
  }

  closeModal(modalId: string): void {
    const modalElement = this.document.getElementById(modalId);
    if (modalElement) {
      modalElement.classList.remove('show', 'd-block');
      modalElement.removeAttribute('aria-modal');
      modalElement.removeAttribute('role');
    }
  }

  // simple handler (replace with real HTTP call when endpoint exists)
  // sendOtp(): void {
  //   const v = (this.updatedValue || '').trim();
  //   if (!v) {
  //     this.errorMessage = 'Please enter a phone number or email to receive OTP.';
  //     return;
  //   }
  //   this.errorMessage = '';
  //   console.log('Requesting OTP for:', v);
  //   this.errorMessage = 'OTP request sent. Please check your phone/email.';
  //   this.closeModal('forgotPasswordModal');
  // }

  sendOTP(): void {
    this.loading = true;
    this.errorMessage = '';
    const input = (this.updatedValue || '').trim();

    const payload: any = {
      userType: 2,
      countryCode: '+91'
    };
    
    // Determine if input is email or phone
    if (this.isEmail(input)) {
        payload.email = input.toLowerCase();
    } else {
        const phoneClean = this.cleanPhone(input);
        if (phoneClean && phoneClean.length === 10) {
            payload.phone = phoneClean;
        } else {
            this.loading = false;
            Swal.fire({
                icon: 'error',
                title: 'Invalid Input',
                text: 'Please enter a valid 10-digit phone number or email.',
            });
            return;
        }
    }
    
    // Check if both email and phone are missing (shouldn't happen with above check, but for safety)
    if (!payload.email && !payload.phone) {
        this.loading = false;
        Swal.fire({
            icon: 'error',
            title: 'Invalid Input',
            text: 'Please enter a valid phone number or email.',
        });
        return;
    }
    
    // You need to ensure your AuthService has a method like 'requestPasswordReset' that takes the payload
    this.auth.requestPasswordReset(payload).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success) {
          this.profileId = res?.result?.userId; // Store userId for later steps
          Swal.fire({
            icon: 'success',
            title: 'OTP Sent',
            text: 'A one-time password has been sent to your ' + (payload.email ? 'email' : 'phone number') + '.',
            timer: 3000
          });
          this.otp = ''; // Clear previous OTP
          this.closeModal('forgotPasswordModal');
          this.openModal('otpVerificationModal');
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Request Failed',
            text: res?.message || 'Failed to send OTP. Please check your details.',
          });
        }
      },
      error: (err) => {
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'An error occurred while requesting OTP. Please try again later.',
        });
      }
    });
  }

  changePhoneOrEmail(): void {
    this.closeModal('otpVerificationModal');
    this.openModal('forgotPasswordModal');
    this.otp = ''; // Optional: Clear the OTP input
    this.errorMessage = ''; // Optional: Clear any OTP error message
}

  verifyOTP(): void {
    this.loading = true;
    this.errorMessage = '';

    if (!this.otp || this.otp.length < 4) { // Basic OTP validation
        this.loading = false;
        Swal.fire({ icon: 'error', title: 'Invalid OTP', text: 'Please enter a valid OTP.' });
        return;
    }

    const payload = { 
        phone: (this.updatedValue || '').trim(), // Send the original input for verification
        otp: this.otp, 
        userType: 2 
    };

    // You need to ensure your AuthService has a method like 'verifyPasswordResetOTP'
    console.log("verify payload ",payload);
    this.auth.verifyPasswordResetOTP(payload).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success) {
          Swal.fire({
            icon: 'success',
            title: 'OTP Verified',
            text: 'OTP verified successfully.',
            timer: 2000
          });
          // Clear password fields for new input
          this.ForgetNewPassword = '';
          this.ForgetConfirmPassword = '';
          this.closeModal('otpVerificationModal');
          this.openModal('changePasswordModal');
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Verification Failed',
            text: res?.message || 'OTP verification failed. Please try again.',
          });
        }
      },
      error: (err) => {
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to verify OTP. Please try again later.',
        });
      }
    });
  }

    changePassword(): void {
    this.loading = true;
    this.errorMessage = '';

    if (!this.ForgetNewPassword || !this.ForgetConfirmPassword) {
      this.loading = false;
      Swal.fire({ icon: 'error', title: 'Missing Field', text: 'Please enter and confirm your new password.' });
      return;
    }
    
    if (String(this.ForgetNewPassword).length < 6 || String(this.ForgetConfirmPassword).length < 6) {
      this.loading = false;
      Swal.fire({ icon: 'error', title: 'Too Short', text: 'Password must be at least 6 characters long.' });
      return;
    }

    if (this.ForgetNewPassword !== this.ForgetConfirmPassword) {
      this.loading = false;
      Swal.fire({ icon: 'error', title: 'Mismatch', text: 'New password and confirm password do not match.' });
      return;
    }

    const payload = { 
        password: this.ForgetConfirmPassword, 
        userType: 2, 
        userId: this.profileId 
    };

    // You need to ensure your AuthService has a method like 'resetPassword'
    this.auth.resetPassword(payload).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success) {
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Your password has been changed successfully.',
            timer: 2000
          });
          this.closeModal('changePasswordModal');
          // Optional: Open a confirmation modal or simply close all modals
          this.openModal('changePasswordConfirmationModal'); 

        } else {
          Swal.fire({
            icon: 'error',
            title: 'Failed',
            text: res?.message || 'Failed to change password. Please try again.',
          });
        }
      },
      error: (err) => {
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to change password. Please try again later.',
        });
      }
    });
  }



}

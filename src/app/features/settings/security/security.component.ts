import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './security.component.html',
  styleUrls: ['./security.component.scss']
})
export class SecurityComponent {
  passwordForm: FormGroup;

  loading = false;
  serverMessage: string | null = null;
  serverSuccess = false;
  submitted = false;

  isVisible = {
    current: false,
    new: false,
    confirm: false,
  };

  private userId: string = localStorage.getItem('userId') || '68dce05004a1d8470ca42f98';
  private readonly API_URL = 'http://localhost:8080/api/v1/reset-password/reset-password';

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.passwordForm = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(6)]],
        newPassword: ['', [Validators.required, Validators.minLength(8), this.strongPasswordValidator]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordsMatchValidator }
    );

    // Update strength meter reactively
    this.passwordForm.get('newPassword')?.valueChanges.subscribe(() => {
      this.passwordStrength = this.computeStrength(this.passwordForm.get('newPassword')?.value || '');
    });
  }

  passwordStrength = { score: 0, label: 'Strength: —' };

  toggle(which: 'current' | 'new' | 'confirm') {
    this.isVisible[which] = !this.isVisible[which];
  }

  // custom validator for matching passwords
  passwordsMatchValidator = (form: AbstractControl): ValidationErrors | null => {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { passwordsMismatch: true };
  };

  // strength/complexity validator
  strongPasswordValidator = (control: AbstractControl): ValidationErrors | null => {
    const v: string = control.value || '';
    const hasUpper = /[A-Z]/.test(v);
    const hasLower = /[a-z]/.test(v);
    const hasNumber = /\d/.test(v);
    const hasSymbol = /[^A-Za-z0-9]/.test(v);
    const ok = hasUpper && hasLower && hasNumber && hasSymbol;
    return ok ? null : { weakPassword: true };
  };

  private computeStrength(v: string) {
    let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
    if (/\d/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v) && v.length >= 12) score++;
    const labels = ['Strength: —', 'Strength: Weak', 'Strength: Fair', 'Strength: Good', 'Strength: Strong'];
    return { score, label: labels[score] };
  }

  resetPassword(): void {
    this.submitted = true;
    this.serverMessage = null;
    this.serverSuccess = false;

    if (!this.passwordForm.valid) {
      this.serverMessage = 'Please fix the errors above and try again.';
      return;
    }

    const { password, newPassword, confirmPassword } = this.passwordForm.value;

    const payload = {
      userId: this.userId,
      Password: password, // capital P as per API
      newPassword,
      confirmPassword
    };

    this.loading = true;

    this.http.post<any>(this.API_URL, payload).subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.success) {
          this.serverSuccess = true;
          this.serverMessage = res?.message || 'Password Reset Successfully.';
          this.passwordForm.reset();
          this.submitted = false;
          this.passwordStrength = { score: 0, label: 'Strength: —' };
        } else {
          this.serverSuccess = false;
          this.serverMessage = res?.message || 'Password reset failed.';
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.serverSuccess = false;
        const apiMsg =
          (err.error && (err.error.message || err.error.error || err.error.msg)) ||
          err.message ||
          'Something went wrong while resetting the password.';
        this.serverMessage = apiMsg;
      }
    });
  }
}

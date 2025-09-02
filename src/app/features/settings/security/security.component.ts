import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './security.component.html',
  styleUrls: ['./security.component.scss']
})
export class SecurityComponent {
  passwordForm: FormGroup;

  // fake "stored password"
  private currentPassword = 'old12345';

  constructor(private fb: FormBuilder) {
    this.passwordForm = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(6)]],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required, Validators.minLength(6)]],
      },
      { validators: this.passwordsMatchValidator }
    );
  }

  isPasswordVisible1 = false;
  isPasswordVisible2 = false;
  isPasswordVisible3 = false;

  togglePasswordVisibility(which: number) {
    if (which === 1) this.isPasswordVisible1 = !this.isPasswordVisible1;
    if (which === 2) this.isPasswordVisible2 = !this.isPasswordVisible2;
    if (which === 3) this.isPasswordVisible3 = !this.isPasswordVisible3;
  }

  // custom validator for matching passwords
  passwordsMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { passwordsMismatch: true };
  }

  resetPassword(): void {
    if (!this.passwordForm.valid) {
      alert('Please fill all fields with valid data.');
      return;
    }

    const { password, newPassword } = this.passwordForm.value;

    if (password !== this.currentPassword) {
      alert('❌ Current password is incorrect.');
      return;
    }

    this.currentPassword = newPassword;
    alert('✅ Password changed successfully (dummy logic).');
    this.passwordForm.reset();
  }
}

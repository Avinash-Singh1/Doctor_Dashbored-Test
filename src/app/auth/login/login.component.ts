import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  email = '';
  password = '';

  constructor(private router: Router) {}

  onSubmit() {
    if (this.email && this.password) {
      // TODO: call AuthService
      console.log('Login successful:', this.email);
      this.router.navigate(['/medical-verification']);
    }
  }
}

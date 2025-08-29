import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule,RouterModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent {
  doctor = {
    name: '',
    email: '',
    password: '',
    phone: ''
  };

  onSubmit() {
    console.log('Doctor Signup:', this.doctor);
    // TODO: call API to register doctor
  }
}

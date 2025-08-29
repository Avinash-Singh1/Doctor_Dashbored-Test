import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent {
  doctor = {
    name: 'Mr. Test',
    email: 'doctor@test.com',
    phone: '7011167639',
    specialization: 'Cardiologist',
    experience: '10 years'
  };
}

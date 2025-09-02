import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent {
  doctor = {
    name: 'Dr. John Doe',
    profilePic: '', // if empty → initial circle shown
    email: 'doctor@test.com',
    phone: '7011167639',
    specialization: 'Cardiologist',
    experience: '10 years',
    about: 'Passionate about patient care and heart health.\nLoves teaching and research.',
    education: [
      { degree: 'MBBS', college: 'AIIMS Delhi', year: '2005' },
      { degree: 'MD Cardiology', college: 'PGIMER Chandigarh', year: '2009' }
    ],
    awards: [
      { name: 'Best Doctor Award', year: '2018' },
      { name: 'Excellence in Cardiology', year: '2020' }
    ],
    memberships: ['IMA', 'Cardiology Society of India'],
    socials: [
      { name: 'LinkedIn', url: 'https://linkedin.com/in/drjohndoe' },
      { name: 'Website', url: 'https://drjohndoe.com' }
    ]
  };
}

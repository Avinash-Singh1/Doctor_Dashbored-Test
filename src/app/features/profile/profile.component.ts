// src/app/features/profile/profile.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../core/services/auth.service'; // <-- adjust path if needed

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

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
      { degree: 'MD Cardiology', college: 'PGIMER Chandigarh', year: '2009' },
    ],
    awards: [
      { name: 'Best Doctor Award', year: '2018' },
      { name: 'Excellence in Cardiology', year: '2020' },
    ],
    memberships: ['IMA', 'Cardiology Society of India'],
    socials: [
      { name: 'LinkedIn', url: 'https://linkedin.com/in/drjohndoe' },
      { name: 'Website', url: 'https://drjohndoe.com' },
    ],
  };

  constructor(private router: Router, private auth: AuthService) {}

  ngOnInit(): void {
    // 1) Immediate synchronous check
    if (!this.auth.hasValidToken()) {
      if (typeof this.auth.clearToken === 'function') {
        this.auth.clearToken();
      }
      this.router.navigate(['/auth/login']);
      return;
    }

    // 2) Subscribe to auth changes
    this.auth.isLoggedIn$().pipe(takeUntil(this.destroy$)).subscribe((isLogged) => {
      if (!isLogged && !this.router.url.startsWith('/auth/login')) {
        this.router.navigate(['/auth/login']);
      }
    });

    // 3) Listen for cross-tab / manual storage clear
    window.addEventListener('storage', this.onStorageEvent);
  }

  private onStorageEvent = (ev: StorageEvent) => {
    const relevantKeys = ['authToken', 'authUser', 'deviceId'];
    if (ev.key === null || relevantKeys.includes(ev.key)) {
      if (!this.auth.hasValidToken()) {
        if (typeof this.auth.clearToken === 'function') {
          this.auth.clearToken();
        }
        if (!this.router.url.startsWith('/auth/login')) {
          this.router.navigate(['/auth/login']);
        }
      }
    }
  };

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('storage', this.onStorageEvent);
  }
}

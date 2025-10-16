// src/app/features/settings/settings.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  settings = {
    notifications: true,
    darkMode: false, // This will be loaded from local storage on init
    language: 'en',
  };

  constructor(private router: Router, private auth: AuthService) {}

  ngOnInit(): void {
    this.initializeSettings(); // New: Load initial settings/dark mode
    
    // 1) Immediate sync check
    if (!this.auth.hasValidToken()) {
      if (typeof this.auth.clearToken === 'function') {
        this.auth.clearToken();
      }
      this.router.navigate(['/auth/login']);
      return;
    }
    // ... (rest of the ngOnInit content remains the same)

    // 2) React to login state changes
    this.auth.isLoggedIn$().pipe(takeUntil(this.destroy$)).subscribe((isLogged) => {
      if (!isLogged && !this.router.url.startsWith('/auth/login')) {
        this.router.navigate(['/auth/login']);
      }
    });

    // 3) Listen for cross-tab / manual clears
    window.addEventListener('storage', this.onStorageEvent);
  }
  
  // NEW METHOD: Initialize settings and dark mode
  private initializeSettings(): void {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    this.settings.darkMode = isDarkMode;
    this.applyDarkMode(isDarkMode);
  }

  // NEW METHOD: Toggle dark mode logic
  toggleDarkMode(): void {
    this.applyDarkMode(this.settings.darkMode);
    // Save preference to local storage
    localStorage.setItem('darkMode', String(this.settings.darkMode));
  }
  
  // NEW METHOD: Apply or remove the dark mode class
  private applyDarkMode(enable: boolean): void {
    if (enable) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

  // ... (onStorageEvent and ngOnDestroy remain the same)

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

  saveSettings() {
    console.log('Settings saved:', this.settings);
    alert('Settings updated successfully!');
    // 🔗 later: send this.settings to API
  }
}
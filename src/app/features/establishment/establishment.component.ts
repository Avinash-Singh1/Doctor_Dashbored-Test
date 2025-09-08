// src/app/features/establishment/establishment.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../core/services/auth.service'; // adjust path if needed

@Component({
  selector: 'app-establishment',
  standalone: true,
  imports: [], // add CommonModule, Material modules, etc. if needed later
  templateUrl: './establishment.component.html',
  styleUrls: ['./establishment.component.scss'],
})
export class EstablishmentComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

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

    // 2) Subscribe to login state
    this.auth.isLoggedIn$().pipe(takeUntil(this.destroy$)).subscribe((isLogged) => {
      if (!isLogged && !this.router.url.startsWith('/auth/login')) {
        this.router.navigate(['/auth/login']);
      }
    });

    // 3) Listen for localStorage changes (cross-tab / manual clears)
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

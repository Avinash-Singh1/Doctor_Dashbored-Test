// src/app/features/user-menu/user-menu.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { AuthService, AuthUser } from '../../core/services/auth.service'; // adjust path

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-menu.component.html',
  styleUrls: ['./user-menu.component.scss'],
})
export class UserMenuComponent implements OnInit, OnDestroy {
  doctorName = 'User';
  phone = '';
  private destroy$ = new Subject<void>();

  constructor(private router: Router, private auth: AuthService) {}

  ngOnInit(): void {
    const u = this.auth.getUserSync();
    if (u) this.applyUser(u);

    this.auth.currentUser().pipe(takeUntil(this.destroy$)).subscribe((user) => {
      if (user) this.applyUser(user);
      else {
        this.doctorName = 'User';
        this.phone = '';
      }
    });
  }

  private applyUser(user: AuthUser): void {
    this.doctorName = user.fullName || (user.email ? user.email.split('@')[0] : 'User');
    this.phone = user.phone || '';
  }

  logout(): void {
    Swal.fire({
      title: 'Log out',
      text: 'Are you sure you want to log out?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, log me out',
      cancelButtonText: 'Cancel',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        // return the promise from AuthService.logout so SweetAlert waits
        return this.auth.logout(false).catch((err) => {
          // Re-throw to let Swal show error state (optional)
          console.error('Logout failed inside preConfirm', err);
          // We resolve anyway (AuthService clears local session even on error),
          // but rethrowing makes Swal mark preConfirm as rejected.
          // return Promise.reject(err);
          return undefined; // swallow error so Swal proceeds — you can change this
        });
      },
      allowOutsideClick: () => !Swal.isLoading(),
    })
      .then((result) => {
        if (result.isConfirmed) {
          Swal.fire({
            icon: 'success',
            title: 'Logged out',
            text: 'You have been logged out successfully.',
            timer: 1500,
            timerProgressBar: true,
            showConfirmButton: false,
          }).then(() => {
            this.router.navigate(['/auth/login']);
          });
        }
      })
      .catch((err) => {
        console.error('Logout flow failed', err);
        Swal.fire({ icon: 'error', title: 'Logout failed', text: 'Please try again.' });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

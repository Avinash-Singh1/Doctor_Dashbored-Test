// user-menu.component.ts
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { AuthService, AuthUser } from '../../core/services/auth.service';

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
  avatarUrl?: string | null = null;
  isOpen = false;
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
        this.avatarUrl = null;
      }
    });
  }

  private applyUser(user: AuthUser): void {
    this.doctorName =
      user.fullName || (user.email ? user.email.split('@')[0] : 'User');
    this.phone = user.phone || '';
    // if your user model has avatar/url, map it; otherwise null
    this.avatarUrl = (user as any).avatarUrl || (user as any).photoURL || null;
  }

  get doctorInitial(): string {
    return (this.doctorName && this.doctorName.charAt(0)) || 'U';
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
  }

  close(): void {
    this.isOpen = false;
  }

  // keyboard accessibility: close on outside click or escape handled by template
  @HostListener('document:click', ['$event'])
  onDocClick(evt: MouseEvent) {
    const path = evt.composedPath ? evt.composedPath() : (evt as any).path || [];
    // if click is outside this component element, close.
    // Using DOM traversal: check for element with selector 'app-user-menu'
    const clickedInside = path.some((n: any) => {
      return n && n.tagName && n.tagName.toLowerCase() === 'app-user-menu';
    });
    if (!clickedInside) {
      this.isOpen = false;
    }
  }

  // logout (keeps your Swal flow)
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
        return this.auth.logout(false).catch((err) => {
          console.error('Logout failed', err);
          return undefined;
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

import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { HttpClient, HttpClientModule, HttpParams, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { CryptoProvider } from '../../../core/services/crypto.service'; 

type DeleteApiResponse = {
  success: boolean;
  status_code: number;
  message: string;
  result?: any;
  time?: number;
};

@Component({
  selector: 'app-delete',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './delete.component.html',
  styleUrls: ['./delete.component.scss']
})
export class DeleteComponent {
  private http = inject(HttpClient);
  private router = inject(Router);

  // If you have an environment file, use that instead:
  // private baseUrl = environment.apiBaseUrl;
  private baseUrl = 'http://82.112.237.181:8080/api/v1';

  loading = false;

  authUser:any;
  currentUser:any
    constructor(
      private crypto: CryptoProvider
    ) {

    }
  

  openModal(modalId: string): void {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      modalElement.classList.add('show', 'd-block');
      modalElement.setAttribute('aria-modal', 'true');
      modalElement.setAttribute('role', 'dialog');
    }
  }

  closeModal(modalId: string): void {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      modalElement.classList.remove('show', 'd-block');
      modalElement.removeAttribute('aria-modal');
      modalElement.removeAttribute('role');
    }
  }

  private getUserId(): any {
    this.authUser = localStorage.getItem('authUser');
    this.currentUser = this.crypto.decryptObj(this.authUser);
    console.log("current user: ",this.currentUser);
    return this.currentUser._id;
  }

  private getAuthHeaders(): HttpHeaders {
    // If your API requires auth, attach it here.
    // Example: Bearer token from localStorage/sessionStorage
    const token = this.crypto.decryptObj(localStorage.getItem('authToken')) || '';
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  submitForm(): void {
    const id = this.getUserId();

    if (!id) {
      alert('Unable to find your account id. Please re-login and try again.');
      return;
    }

    this.loading = true;

    const params = new HttpParams().set('id', id);
    const headers = this.getAuthHeaders();

    this.http
      .put<DeleteApiResponse>(`${this.baseUrl}/doctor/delete-profile`, {}, { params, headers })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => {
          if (res?.success) {
            // Close modal, clear local session, and redirect to login
            this.closeModal('delete_account_confirm');

            try {
              // Clear anything that could keep the user "logged in"
              localStorage.clear();
              sessionStorage.clear();
            } catch {
              /* ignore */
            }

            // Optional: show a quick confirmation
            // You can replace with a toast/snackbar if you have one
            alert('Your account has been deleted successfully.');

            // Navigate to login page and replace history
            this.router.navigate(['/login'], { replaceUrl: true });
          } else {
            alert(res?.message || 'Could not delete the account. Please try again.');
          }
        },
        error: (err) => {
          // Basic error message. Replace with your toast service if available.
          const msg =
            err?.error?.message ||
            err?.message ||
            'Something went wrong while deleting your account.';
          alert(msg);
        }
      });
  }
}

// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { CryptoProvider } from './crypto.service';

export interface AuthUser {
  _id?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  [k: string]: any;
}
// http://localhost:8080/api/v1/registration/forgetPhone
// /api/v1/registration/verifyForgetPhone
const API_ENDPOINTS = {
    new: {
        forgetPhone: 'api/v1/registration/forgetPhone', // Example path
        // forgetPhone: 'auth/v1/doctor/forget-password/send-otp', // Example path
        verifyForgetPhone: 'api/v1/registration/verifyForgetPhone', // Example path
        changePasswordForgetPhone: 'api/v1/registration/changePasswordForgetPhone', // Example path
    }
};

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'authToken';
  private readonly USER_KEY = 'authUser';
  private readonly deviceIdKey = 'deviceId';

  private loggedIn$ = new BehaviorSubject<boolean>(false);
  private currentUser$ = new BehaviorSubject<AuthUser | null>(null);

  private LOGIN_URL = 'http://82.112.237.181:3000/api/v1/login';
  private LOGOUT_URL = 'http://82.112.237.181:3000/api/v1/logout';

  constructor(private http: HttpClient, private router: Router, private crypto: CryptoProvider) {
    this.bootstrapFromStorage();
  }

  private isLocalStorageAvailable(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  private setEncryptedItem(key: string, value: any): void {
    if (!this.isLocalStorageAvailable()) return;
    try {
      const enc = this.crypto.encryptObj(value);
      localStorage.setItem(key, enc);
    } catch (err) {
      console.error('Failed to encrypt & set item', key, err);
    }
  }

  private getEncryptedItem(key: string): any | null {
    if (!this.isLocalStorageAvailable()) return null;
    try {
      const enc = localStorage.getItem(key);
      if (!enc) return null;
      return this.crypto.decryptObj(enc);
    } catch (err) {
      console.warn('Failed to decrypt item', key, err);
      return null;
    }
  }

  private removeEncryptedItem(key: string): void {
    if (!this.isLocalStorageAvailable()) return;
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.warn('Failed to remove item', key, err);
    }
  }

  private bootstrapFromStorage(): void {
    try {
      const token = this.getToken(); // decrypts internally
      const user = this.getUserSyncFromStorage();
      console.log('Bootstrap AuthService, found token/user:', !!token, !!user);
      this.loggedIn$.next(!!token);
      this.currentUser$.next(user);
    } catch (err) {
      console.warn('bootstrapFromStorage error', err);
      this.loggedIn$.next(false);
      this.currentUser$.next(null);
    }
  }

  private getUserSyncFromStorage(): AuthUser | null {
    try {
      const u = this.getEncryptedItem(this.USER_KEY);
      return u ? (u as AuthUser) : null;
    } catch {
      return null;
    }
  }

  isLoggedIn$(): Observable<boolean> {
    return this.loggedIn$.asObservable();
  }

  currentUser(): Observable<AuthUser | null> {
    return this.currentUser$.asObservable();
  }

  isLoggedIn(): boolean {
    return this.loggedIn$.value;
  }

  getToken(): string | null {
    try {
      const t = this.getEncryptedItem(this.TOKEN_KEY);
      return t ? String(t) : null;
    } catch {
      return null;
    }
  }

  getUserSync(): AuthUser | null {
    return this.currentUser$.value;
  }

  login(payload: any): Observable<any> {
    return this.http.post(this.LOGIN_URL, payload).pipe(
      tap((res: any) => {
        if (res?.success && res?.result) {
          const token = res.result?.token;
          const user = res.result?.user ?? res.result;
          if (token) {
            this.setSession(token, user);
          }
        }
      })
    );
  }

  // logout(redirectToLogin = true): void {
  //   try {
  //     this.http.post(this.LOGOUT_URL, {}).subscribe({ next: () => {}, error: () => {} });
  //   } catch {}
  //   this.removeEncryptedItem(this.TOKEN_KEY);
  //   this.removeEncryptedItem(this.USER_KEY);
  //   this.removeEncryptedItem(this.deviceIdKey);
  //   this.loggedIn$.next(false);
  //   this.currentUser$.next(null);
  //   if (redirectToLogin) {
  //     this.router.navigate(['/auth/login']);
  //   }
  // }
   logout(redirectToLogin = true): Promise<void> {
    const deviceId = this.getOrCreateDeviceId();
    return new Promise((resolve) => {
      // call backend — AuthInterceptor should attach Authorization header (if token present)
      this.http.post(this.LOGOUT_URL, { deviceId }).subscribe({
        next: () => {
          // success on server: clear local session
          this.clearLocalSession();
          if (redirectToLogin) {
            this.router.navigate(['/auth/login']);
          }
          resolve();
        },
        error: (err) => {
          // log error but still clear local session to guarantee logout client-side
          console.warn('[AuthService] logout request failed, clearing local session anyway', err);
          this.clearLocalSession();
          if (redirectToLogin) {
            this.router.navigate(['/auth/login']);
          }
          resolve();
        },
      });
    });
  }

  /** Clears encrypted storage & updates subjects */
  private clearLocalSession(): void {
    this.removeEncryptedItem(this.TOKEN_KEY);
    this.removeEncryptedItem(this.USER_KEY);
    // optionally keep deviceId or remove based on your needs; we remove it
    this.removeEncryptedItem(this.deviceIdKey);
    this.loggedIn$.next(false);
    this.currentUser$.next(null);
  }

  setSession(token: string | null, user: AuthUser | null): void {
    if (token) {
      this.setEncryptedItem(this.TOKEN_KEY, token);
      this.loggedIn$.next(true);
    }
    if (user) {
      try {
        this.setEncryptedItem(this.USER_KEY, user);
      } catch (e) {
        console.warn('Failed to save encrypted user to localStorage', e);
      }
      this.currentUser$.next(user);
    }
  }

  clearToken(): void {
    this.removeEncryptedItem(this.TOKEN_KEY);
    this.loggedIn$.next(false);
  }

  getAuthHeaders(): { headers: HttpHeaders } {
    const token = this.getToken();
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return { headers };
  }

  getOrCreateDeviceId(): string {
    let id = this.getEncryptedItem(this.deviceIdKey) as string | null;
    if (id) return id;

    try {
      if ((window as any).crypto?.randomUUID) {
        id = (window as any).crypto.randomUUID();
      }
    } catch {}

    if (!id) {
      id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }

    this.setEncryptedItem(this.deviceIdKey, id);
    return id;
  }

  hasValidToken(): boolean {
    const t = this.getToken();
    return !!t;
  }

   private apiUrl = 'http://82.112.237.181:8080';
   // Method 1: Send OTP
  requestPasswordReset(payload: any): Observable<any> {
    // You might need to adjust API_ENDPOINTS structure
    return this.http.post(`${this.apiUrl}/${API_ENDPOINTS.new.forgetPhone}`, payload);
  }

  // Method 2: Verify OTP
  verifyPasswordResetOTP(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${API_ENDPOINTS.new.verifyForgetPhone}`, payload);
  }

  // Method 3: Change Password
  resetPassword(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${API_ENDPOINTS.new.changePasswordForgetPhone}`, payload);
  }
}

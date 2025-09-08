import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface AuthUser {
  _id?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  [k: string]: any;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'authToken';
  private readonly USER_KEY = 'authUser';
  private readonly deviceIdKey = 'deviceId';

  private loggedIn$ = new BehaviorSubject<boolean>(false);
  private currentUser$ = new BehaviorSubject<AuthUser | null>(null);

  // backend endpoints
  private LOGIN_URL = 'http://localhost:3000/api/v1/login';
  private LOGOUT_URL = 'http://localhost:3000/api/v1/logout';

  constructor(private http: HttpClient, private router: Router) {
    this.bootstrapFromStorage();
  }

  /** Initialize service state from localStorage (if any) */
  private bootstrapFromStorage(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const user = localStorage.getItem(this.USER_KEY);
    console.log('Bootstrap AuthService, found token/user:', !!token, !!user);
    this.loggedIn$.next(!!token);
    try {
      this.currentUser$.next(user ? JSON.parse(user) : null);
    } catch {
      this.currentUser$.next(null);
    }
  }

  /* ---------------------------
     Observables / synchronous helpers
     --------------------------- */
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
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getUserSync(): AuthUser | null {
    return this.currentUser$.value;
  }

  /* ---------------------------
     API methods
     --------------------------- */
  login(payload: any): Observable<any> {
    return this.http.post(this.LOGIN_URL, payload).pipe(
      tap((res: any) => {
        // backend expected to return { success: true, result: { token, user } }
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

  logout(redirectToLogin = true): void {
    // optionally notify backend
    try {
      // fire & forget
      this.http.post(this.LOGOUT_URL, {}).subscribe({ next: () => {}, error: () => {} });
    } catch {}
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.loggedIn$.next(false);
    this.currentUser$.next(null);
    if (redirectToLogin) {
      this.router.navigate(['/auth/login']);
    }
  }

  setSession(token: string | null, user: AuthUser | null): void {
    if (token) {
      localStorage.setItem(this.TOKEN_KEY, token);
      this.loggedIn$.next(true);
    }
    if (user) {
      try {
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      } catch (e) {
        console.warn('Failed to save user to localStorage', e);
      }
      this.currentUser$.next(user);
    }
  }

  clearToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
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

  /** Ensure a persistent deviceId saved in localStorage (used in OTP/session flows) */
  getOrCreateDeviceId(): string {
    const key = this.deviceIdKey;
    let id = localStorage.getItem(key);
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

    localStorage.setItem(key, id);
    return id;
  }

  hasValidToken(): boolean {
    const t = this.getToken();
    return !!t;
  }
}

// src/app/core/interceptors/auth.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpHandler, HttpRequest, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CryptoProvider } from '../services/crypto.service'; // adjust path if your folder layout is different

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private TOKEN_KEY = 'authToken';

  constructor(private crypto: CryptoProvider) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    try {
      const enc = localStorage.getItem(this.TOKEN_KEY);
      if (!enc) {
        return next.handle(req);
      }
      const token = this.crypto.decryptObj(enc);
      if (!token) return next.handle(req);

      const cloned = req.clone({
        setHeaders: {
          Authorization: `Bearer ${String(token)}`,
        },
      });
      return next.handle(cloned);
    } catch (err) {
      console.warn('AuthInterceptor: failed to read/decrypt token', err);
      return next.handle(req);
    }
  }
}

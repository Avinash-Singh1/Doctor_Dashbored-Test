import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> | boolean | UrlTree {
    // Quick synchronous check so routes that are triggered immediately don't fail
    if (this.auth.isLoggedIn()) {
      return true;
    }

    // If not logged in synchronously, subscribe to observable (useful during bootstrap)
    return this.auth.isLoggedIn$().pipe(
      map((isLogged) => {
        if (isLogged) return true;
        Swal.fire({
          icon: 'warning',
          title: 'Unauthorized',
          text: 'You need to login to access this page.',
          showConfirmButton: true,
        });
        return this.router.createUrlTree(['/auth/login']);
      })
    );
  }
}

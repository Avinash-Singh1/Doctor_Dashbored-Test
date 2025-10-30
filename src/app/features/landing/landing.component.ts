import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent {

  constructor(private router: Router) {}

  goToSignup(): void {
    this.router.navigate(['/auth/signup']);
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}

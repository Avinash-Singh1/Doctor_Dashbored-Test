import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-menu.component.html',
  styleUrls: ['./user-menu.component.scss']
})
export class UserMenuComponent {
  doctorName = 'Mr. Test';
  phone = '7011167639';

  constructor(
    private router: Router,  
  ) {

  }

  logout() {
    console.log('User logged out');
    // TODO: call AuthService + redirect to /auth/login
      this.router.navigate(['/auth/login']);
  }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../../sidebar/sidebar.component';
import { UserMenuComponent } from '../../../header/user-menu/user-menu.component';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, UserMenuComponent],
  templateUrl: './dashboard-layout.component.html',
  styleUrls: ['./dashboard-layout.component.scss']
})
export class DashboardLayoutComponent {
  isMobileOpen = false;

  toggleSidebar() {
    this.isMobileOpen = !this.isMobileOpen;
  }

  closeSidebar() {
    this.isMobileOpen = false;
  }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  menuItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Calendar', path: '/calendar' },
    { label: 'My Patients', path: '/my-patient' },
    { label: 'Medical Verification', path: '/medical-verification' },
    { label: 'Establishment', path: '/establishment' },
    { label: 'Services', path: '/services' },
    { label: 'Procedure', path: '/procedure' },
    { label: 'Videos', path: '/videos' },
    { label: 'FAQs', path: '/faq' },
    { label: 'Profile', path: '/profile' },
    { label: 'Reviews', path: '/reviews' },
    { label: 'Settings', path: '/settings' }
  ];
}

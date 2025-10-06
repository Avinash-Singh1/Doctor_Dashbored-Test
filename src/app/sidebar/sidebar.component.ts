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
  { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  { label: 'Calendar', path: '/calendar', icon: 'calendar_today' },
  { label: 'My Patients', path: '/my-patient', icon: 'groups' },
  { label: 'Medical Verification', path: '/medical-verification', icon: 'verified' },
  { label: 'Establishment', path: '/establishment', icon: 'business' },
  { label: 'Services', path: '/services', icon: 'miscellaneous_services' },
  { label: 'Procedure', path: '/procedure', icon: 'healing' },
  { label: 'Videos', path: '/videos', icon: 'ondemand_video' },
  { label: 'FAQs', path: '/faq', icon: 'help_outline' },
  { label: 'Profile', path: '/profile', icon: 'person' },
  { label: 'Reviews', path: '/reviews', icon: 'star_rate' },

  {
    label: 'Settings',
    path: null,
    icon: 'settings',
    children: [
      // { label: 'General', path: '/settings/general', icon: 'tune' },
      // { label: 'Notifications', path: '/settings/notifications', icon: 'notifications' },
      { label: 'Security', path: '/settings/security', icon: 'lock' },
      { label: 'Delete Account', path: '/settings/delete', icon: 'delete' },
    ],
    expanded: false
  }
];


toggleDropdown(item: any) {
  item.expanded = !item.expanded;
}
}

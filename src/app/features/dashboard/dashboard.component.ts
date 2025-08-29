import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  stats = [
    { label: 'Patients', value: 120 },
    { label: 'Appointments', value: 45 },
    { label: 'Reviews', value: 32 }
  ];
}

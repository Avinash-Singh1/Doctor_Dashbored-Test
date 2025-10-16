import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface Appointment {
  // Required fields for type compatibility with child view components:
  id: string; 
  doctorName: string; 
  
  // Fields mapped from the API response and used in the side panel:
  _id: string; 
  date: string;
  fullName: string;
  reason: string | null;
  status: number; // 0, 1, 2...
  consultationType: 'in_clinic' | 'video';
  doctorDetails: { fullName: string; phone: string; };
  patientDetails: { fullName: string; phone: string; };
}
@Component({
  selector: 'nectar-day-view',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './nectar-day-view.component.html',
  styleUrls: ['./nectar-day-view.component.scss'],
  providers: [DatePipe]
})
export class NectarDayViewComponent {
  @Input() today: Date = new Date();
  @Input() appointments: Appointment[] = [];

  hours: number[] = Array.from({ length: 24 }, (_, i) => i);

  getAppointmentsForHour(hour: number): Appointment[] {
    return this.appointments.filter(
      a =>
        new Date(a.date).getDate() === this.today.getDate() &&
        new Date(a.date).getHours() === hour
    );
  }
}

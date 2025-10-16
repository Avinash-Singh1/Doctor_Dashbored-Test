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
  selector: 'nectar-week-view',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './nectar-week-view.component.html',
  styleUrls: ['./nectar-week-view.component.scss'],
  providers: [DatePipe]
})
export class NectarWeekViewComponent {
  @Input() today: Date = new Date();
  @Input() appointments: Appointment[] = [];

  get weekDays(): Date[] {
    const startOfWeek = new Date(this.today);
    startOfWeek.setDate(this.today.getDate() - this.today.getDay()); // Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  }

  getAppointmentsForDay(day: Date): Appointment[] {
    return this.appointments.filter(
      a =>
        new Date(a.date).toDateString() === day.toDateString()
    );
  }
}

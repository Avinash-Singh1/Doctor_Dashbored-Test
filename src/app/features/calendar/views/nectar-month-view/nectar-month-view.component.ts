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
  selector: 'nectar-month-view',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './nectar-month-view.component.html',
  styleUrls: ['./nectar-month-view.component.scss'],
  providers: [DatePipe]
})
export class NectarMonthViewComponent {
  @Input() today: Date = new Date();
  @Input() appointments: Appointment[] = [];

  currentMonth: Date = new Date();

  get monthDays(): Date[] {
    const start = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
    const end = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0);

    const days: Date[] = [];
    for (let i = 1; i <= end.getDate(); i++) {
      days.push(new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), i));
    }
    return days;
  }

  hasAppointments(day: Date): boolean {
    return this.appointments.some(
      a => new Date(a.date).toDateString() === day.toDateString()
    );
  }
}

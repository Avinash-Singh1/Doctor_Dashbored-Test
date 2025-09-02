import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';

interface Appointment {
  id: number;
  fullName: string;
  doctorName: string;
  reason: string;
  date: Date;
  status: 'booked' | 'completed' | 'cancelled';
  consultationType: 'in_clinic' | 'video';
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

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

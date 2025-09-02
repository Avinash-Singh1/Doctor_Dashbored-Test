import { CommonModule, DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NectarDayViewComponent } from './views/nectar-day-view/nectar-day-view.component';
import { NectarMonthViewComponent } from './views/nectar-month-view/nectar-month-view.component';
import { NectarWeekViewComponent } from './views/nectar-week-view/nectar-week-view.component';

// Dummy interfaces (same as before)
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
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, DatePipe, MatIconModule,NectarDayViewComponent,NectarMonthViewComponent,NectarWeekViewComponent],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  providers: [DatePipe]
})
export class CalendarComponent {
  hideView = false;
  monthdetails: Date = new Date();
  viewmode: 'day' | 'week' | 'month' = 'month';
  today: Date = new Date();
  todayDate: Date = new Date();
  scheduleDay: string = "Today's Schedule";

  appointmentConstant = [
    { status: 'booked', label: 'PENDING', icon: 'hourglass_empty' },
    { status: 'completed', label: 'COMPLETED', icon: 'check_circle' },
    { status: 'cancelled', label: 'CANCELLED', icon: 'cancel' }
  ];

  appointments: Appointment[] = [
    {
      id: 1,
      fullName: 'John Smith',
      doctorName: 'Dr. Watson',
      reason: 'Chest Pain',
      date: new Date(),
      status: 'booked',
      consultationType: 'in_clinic'
    },
    {
      id: 2,
      fullName: 'Alice Brown',
      doctorName: 'Dr. Watson',
      reason: 'Follow-up',
      date: new Date(new Date().setHours(15, 30)),
      status: 'completed',
      consultationType: 'video'
    },
    {
      id: 3,
      fullName: 'Robert Green',
      doctorName: 'Dr. Watson',
      reason: 'General Checkup',
      date: new Date(new Date().setHours(17, 0)),
      status: 'cancelled',
      consultationType: 'in_clinic'
    }
  ];

  getAppointmentsByStatus(status: string) {
    return this.appointments.filter(a => a.status === status);
  }

  onChangingMonth(value: number) {
    if (!value) {
      this.viewmode = 'day'; // go to today in day view
      return;
    }
    this.monthdetails = new Date(
      this.monthdetails.setMonth(this.monthdetails.getMonth() + value)
    );
  }

  onChangingMode(mode: 'day' | 'week' | 'month') {
    this.viewmode = mode;
    if (mode !== 'month') {
      this.today = new Date();
    }
  }

  onChangeSchedule(res: number = 0) {
    this.todayDate = new Date(this.todayDate.setDate(this.todayDate.getDate() + res));
  }

  isSubmenuOpen = false;

  onMenuClick() {
    const sideMenu = document.getElementById('sideMenu');
    if (sideMenu) {
      sideMenu.classList.toggle('mobileMenu');
    }
  }

  settingtoggleSubmenu(event: Event) {
    event.preventDefault();
    this.isSubmenuOpen = !this.isSubmenuOpen;
  }
}

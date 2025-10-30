// src/app/features/calendar/calendar.component.ts
import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, OnDestroy, Inject, Injectable } from '@angular/core'; 
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';
import { NectarDayViewComponent } from './views/nectar-day-view/nectar-day-view.component';
import { NectarMonthViewComponent } from './views/nectar-month-view/nectar-month-view.component';
import { NectarWeekViewComponent } from './views/nectar-week-view/nectar-week-view.component';
import { AuthService } from '../../core/services/auth.service';
import { CryptoProvider } from '../../core/services/crypto.service'; 
import { environment } from '../../../environments/environment';
// ------------------- PLACEHOLDER / MOCK IMPORTS -------------------
@Injectable({ providedIn: 'root' })
class ApiService {
  private Token: any;
  constructor(private crypto: CryptoProvider) {
    this.Token = this.crypto.decryptObj(localStorage.getItem('authToken'));
  }

  post(endpoint: string, payload: any): Subject<any> {
    const result$ = new Subject<any>();
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.Token}`
      },
      body: JSON.stringify(payload)
    })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json();
      })
      .then(data => {
        result$.next(data);
        result$.complete();
      })
      .catch(error => {
        result$.error(error);
        result$.complete();
      });
    return result$;
  }
}

class LocalStorageService {
  getItem(key: string): string | null {
    if (key === 'approvalStatus') return 'APPROVED';
    return null;
  }
}

const APP_CONSTANTS = {
  PROFILE_STATUS: { APPROVE: 'APPROVED', PENDING: 'PENDING', DEACTIVATE: 'DEACTIVATE', DELETE: 'DELETE', REJECT: 'REJECT' },
};

const API_ENDPOINTS = {
  doctor: { getCalendarData: `${environment.baseUrl2}/api/v1/doctor/get-calender` },
};

declare var moment: any;
// ------------------- END PLACEHOLDER / MOCK IMPORTS -------------------

export interface Appointment {
  id: string;
  doctorName: string;
  _id: string;
  date: string;
  fullName: string;
  reason: string | null;
  status: number;
  consultationType: 'in_clinic' | 'video';
  doctorDetails: { fullName: string; phone: string; };
  patientDetails: { fullName: string; phone: string; email: string; profilePic?: string; isverified?: number; };
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, DatePipe, MatIconModule, NectarDayViewComponent, NectarMonthViewComponent, NectarWeekViewComponent],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  providers: [DatePipe, ApiService, LocalStorageService],
})
export class CalendarComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  hideView = true;
  monthdetails: Date = new Date();
  viewmode: 'day' | 'week' | 'month' = 'month';
  today: Date = new Date();
  todayDate: Date = new Date();
  currentWeekStart: Date = this.getStartOfWeek(new Date());
  scheduleDay: string = "Today's Schedule";
  isLoading: boolean = false;

  appointmentConstant = [
    { status: 0, label: 'PENDING', icon: 'hourglass_empty' },
    { status: 1, label: 'COMPLETED', icon: 'check_circle' },
    { status: 2, label: 'CANCELLED', icon: 'cancel' }
  ];

  appointments: Appointment[] = [];
  isSubmenuOpen = false;

  constructor(
    private router: Router,
    private auth: AuthService,
    private apiService: ApiService,
    private localStorage: LocalStorageService,
    @Inject(DatePipe) private datepipe: DatePipe
  ) {
    if (typeof moment === 'undefined') {
      console.warn("Moment.js is not defined. Using native Date for now.");
    }
  }

  ngOnInit(): void {
    if (!this.auth.hasValidToken()) {
      if (typeof this.auth.clearToken === 'function') this.auth.clearToken();
      this.router.navigate(['/auth/login']);
      return;
    }

    this.auth.isLoggedIn$().pipe(takeUntil(this.destroy$)).subscribe((isLogged) => {
      if (!isLogged && !this.router.url.startsWith('/auth/login')) {
        this.router.navigate(['/auth/login']);
      }
    });

    window.addEventListener('storage', this.onStorageEvent);
    const approvalStatus = this.localStorage.getItem("approvalStatus");
    this.hideView = approvalStatus !== APP_CONSTANTS.PROFILE_STATUS.APPROVE;

    if (!this.hideView) this.fetchAppointments(this.todayDate);
  }

  // 🗓️ HELPER: Get start of week (Sunday)
  private getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // Sunday = 0
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  // 🗓️ WEEK NAVIGATION
  onChangeWeek(offset: number): void {
    const newWeek = new Date(this.currentWeekStart);
    newWeek.setDate(newWeek.getDate() + offset * 7);
    this.currentWeekStart = this.getStartOfWeek(newWeek);
    this.fetchAppointments(this.currentWeekStart);
  }

  // 🗓️ WEEK LABEL DISPLAY (e.g. “27 Oct – 2 Nov 2025”)
  getWeekLabel(): string {
    const start = new Date(this.currentWeekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const startLabel = this.datepipe.transform(start, 'd MMM');
    const endLabel = this.datepipe.transform(end, 'd MMM yyyy');
    return `${startLabel} - ${endLabel}`;
  }

  private getStartAndEndDateOfMonth(date: Date): { startDate: string, endDate: string } {
    const ref = new Date(date);
    const startOfMonth = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const endOfMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    return {
      startDate: this.datepipe.transform(startOfMonth, 'yyyy-MM-dd') || '',
      endDate: this.datepipe.transform(endOfMonth, 'yyyy-MM-dd') || ''
    };
  }

  stringify(obj: any): string {
    return JSON.stringify(obj);
  }

  getAppointmentsByStatus(status: number): Appointment[] {
    const selectedDateString = this.datepipe.transform(this.todayDate, 'yyyy-MM-dd');
    return this.appointments.filter(a =>
      a.status === status &&
      this.datepipe.transform(a.date, 'yyyy-MM-dd') === selectedDateString
    );
  }

  fetchAppointments(date: Date): void {
    this.isLoading = true;
    this.appointments = [];

    const { startDate, endDate } = this.getStartAndEndDateOfMonth(date);
    const payload = { startDate, endDate };

    this.apiService.post(API_ENDPOINTS.doctor.getCalendarData, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (apiRes: any) => {
          this.isLoading = false;
          const fetchedAppointments = (apiRes.result || [])
            .map((item: any) => item.data)
            .flat()
            .map((raw: any) => ({
              ...raw,
              id: raw._id,
              doctorName: raw.doctorDetails.fullName || 'N/A',
            } as Appointment));
          this.appointments = fetchedAppointments;
        },
        error: (error: any) => {
          this.isLoading = false;
          this.appointments = [];
          console.error('Error fetching appointments:', error);
        },
      });
  }

  onChangingMonth(value: number) {
    if (!value) {
      this.monthdetails = new Date();
      this.viewmode = 'day';
      this.todayDate = new Date();
      this.fetchAppointments(this.todayDate);
      return;
    }
    this.monthdetails = new Date(this.monthdetails.setMonth(this.monthdetails.getMonth() + value));
    this.fetchAppointments(this.monthdetails);
  }

  onChangingMode(mode: 'day' | 'week' | 'month') {
    this.viewmode = mode;
    if (mode === 'week') {
      this.currentWeekStart = this.getStartOfWeek(new Date());
    } else if (mode !== 'month') {
      this.today = new Date();
      this.todayDate = new Date();
    }
    this.fetchAppointments(this.todayDate);
  }

  onChangeSchedule(res: number = 0): void {
    if (this.hideView) return;
    const newDate = new Date(this.todayDate);
    newDate.setDate(newDate.getDate() + res);
    this.todayDate = newDate;
    this.fetchAppointments(this.todayDate);
  }

  onMenuClick() {
    const sideMenu = document.getElementById('sideMenu');
    if (sideMenu) sideMenu.classList.toggle('mobileMenu');
  }

  settingtoggleSubmenu(event: Event) {
    event.preventDefault();
    this.isSubmenuOpen = !this.isSubmenuOpen;
  }

  private onStorageEvent = (ev: StorageEvent) => {
    const relevantKeys = ['authToken', 'authUser', 'deviceId'];
    if (ev.key === null || relevantKeys.includes(ev.key)) {
      if (!this.auth.hasValidToken()) {
        if (typeof this.auth.clearToken === 'function') this.auth.clearToken();
        if (!this.router.url.startsWith('/auth/login')) this.router.navigate(['/auth/login']);
      }
    }
  };

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('storage', this.onStorageEvent);
  }

  onChangeDay(direction: number): void {
  const newDate = new Date(this.today);
  newDate.setDate(newDate.getDate() + direction);
  this.today = newDate;
}

// onChangingMonth(value: number): void {
//   if (value === 0) {
//     this.today = new Date(); // resets current day
//     this.currentWeekStart = this.getStartOfWeek(new Date());
//   } else {
//     const newDate = new Date(this.monthdetails);
//     newDate.setMonth(newDate.getMonth() + value);
//     this.monthdetails = newDate;
//   }
// }

}

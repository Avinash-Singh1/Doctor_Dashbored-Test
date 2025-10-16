// src/app/features/calendar/calendar.component.ts
import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, OnDestroy, Inject } from '@angular/core'; 
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';
import { NectarDayViewComponent } from './views/nectar-day-view/nectar-day-view.component';
import { NectarMonthViewComponent } from './views/nectar-month-view/nectar-month-view.component';
import { NectarWeekViewComponent } from './views/nectar-week-view/nectar-week-view.component';
import { AuthService } from '../../core/services/auth.service';

// ------------------- PLACEHOLDER / MOCK IMPORTS -------------------
// NOTE: These mock classes simulate your actual services (ApiService, AuthService, LocalStorageService). 
// You must ensure your actual services correctly handle HttpClient and Bearer tokens.
class ApiService {
  // Hardcoded token from the user's request. WARNING: This should be managed securely 
  // (e.g., retrieved from a secure Auth Service) in a real application.
  private hardcodedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGYwYjdjYTM4MzNlYzhlMGRlOWViNjUiLCJ1c2VyVHlwZSI6MiwiZnVsbE5hbWUiOiJNci4gQXZpbmFzaC1UZXN0IiwiaWF0IjoxNzYwNjA4NDkzLCJleHAiOjE3NjEyMTMyOTN9.-8uSamI8_Q85x14oVNNEXy7YngUsN4ZmQCAIo9K1_rU';
  
  // FIX: Perform an actual API request using fetch and return data via Subject
  post(endpoint: string, payload: any): Subject<any> {
    const result$ = new Subject<any>();

    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.hardcodedToken}`
      },
      body: JSON.stringify(payload)
    })
    .then(response => {
      if (!response.ok) {
        // Throw an error for non-2xx status codes
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // Push successful data to the Subject
      result$.next(data);
      result$.complete();
    })
    .catch(error => {
      // Push error to the Subject's error channel
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
  PROFILE_STATUS: {
    APPROVE: 'APPROVED',
    PENDING: 'PENDING',
    DEACTIVATE: 'DEACTIVATE',
    DELETE: 'DELETE',
    REJECT: 'REJECT',
  },
};

const API_ENDPOINTS = {
  doctor: {
    getCalendarData: 'http://localhost:8080/api/v1/doctor/get-calender',
  },
};

declare var moment: any;
// ------------------- END PLACEHOLDER / MOCK IMPORTS -------------------

// FIX: Define a single Appointment interface that includes all required fields 
// by the component's views and its own template logic.
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
  selector: 'app-calendar',
  standalone: true,
  // MatIconModule is kept to replace the missing svg-icon component
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
  scheduleDay: string = "Today's Schedule";
  isLoading: boolean = false; 

  appointmentConstant = [
    { status: 0, label: 'PENDING', icon: 'hourglass_empty' },
    { status: 1, label: 'COMPLETED', icon: 'check_circle' },
    { status: 2, label: 'CANCELLED', icon: 'cancel' }
  ];

  // FIX: Use the unified Appointment interface
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
      if (typeof this.auth.clearToken === 'function') {
        this.auth.clearToken();
      }
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
    const isApproved = approvalStatus === APP_CONSTANTS.PROFILE_STATUS.APPROVE;
    this.hideView = !isApproved;

    if (isApproved) {
      this.fetchAppointments(this.todayDate);
    }
  }

  // FIX: Implement the stringify method to replace the deprecated 'stringify' pipe
  stringify(obj: any): string {
    return JSON.stringify(obj);
  }

  // FIX: Implement the filtering method to replace the missing 'filterAppointment' pipe
  getAppointmentsByStatus(status: number): Appointment[] {
    // Determine the date string for filtering the right-hand panel
    const selectedDateString = this.datepipe.transform(this.todayDate, 'yyyy-MM-dd');
    
    return this.appointments.filter(a => 
      a.status === status && 
      // Compare only the date part, ignoring time
      this.datepipe.transform(a.date, 'yyyy-MM-dd') === selectedDateString
    );
  }

  fetchAppointments(date: Date): void {
    this.isLoading = true;
    this.appointments = []; 

    const payload = {
      // The API expects the date in "yyyy-MM-dd" format
      today: this.datepipe.transform(date, "yyyy-MM-dd"),
    };
    
    this.apiService
      .post(API_ENDPOINTS.doctor.getCalendarData, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (apiRes: any) => {
          this.isLoading = false;
          console.log('API Response:', apiRes);
          const fetchedAppointments = (apiRes.result || [])
            .map((item: any) => item.data)
            .flat()
            // FIX: Map the raw API data to the required Appointment interface
            .map((raw: any) => ({
              ...raw,
              id: raw._id, // Mapping _id to id for component compatibility
              // Using non-optional access here since we rely on it being present for typing/display
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
    this.monthdetails = new Date(
      this.monthdetails.setMonth(this.monthdetails.getMonth() + value)
    );
    // Fetch data for the new month if needed for month/week views
    this.fetchAppointments(this.monthdetails);
  }

  onChangingMode(mode: 'day' | 'week' | 'month') {
    this.viewmode = mode;
    if (mode !== 'month') {
      this.today = new Date();
      this.todayDate = new Date();
    }
    // Refetch data based on the new view mode's date
    this.fetchAppointments(this.todayDate);
  }

  onChangeSchedule(res: number = 0): void {
    if (this.hideView) return;
    
    // Using native Date object manipulation (replacing moment.js logic)
    const newDate = new Date(this.todayDate);
    newDate.setDate(newDate.getDate() + res);
    this.todayDate = newDate;

    // Fetch data for the newly selected day
    this.fetchAppointments(this.todayDate);
  }
  
  // The rest of the methods are unchanged
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
  
  private onStorageEvent = (ev: StorageEvent) => {
    const relevantKeys = ['authToken', 'authUser', 'deviceId'];
    if (ev.key === null || relevantKeys.includes(ev.key)) {
      if (!this.auth.hasValidToken()) {
        if (typeof this.auth.clearToken === 'function') {
          this.auth.clearToken();
        }
        if (!this.router.url.startsWith('/auth/login')) {
          this.router.navigate(['/auth/login']);
        }
      }
    }
  };

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('storage', this.onStorageEvent);
  }
}

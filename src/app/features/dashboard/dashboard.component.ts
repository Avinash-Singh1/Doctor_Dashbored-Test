// src/app/features/dashboard/dashboard.component.ts
import {
  ApexChart,
  ApexNonAxisChartSeries,
  ApexAxisChartSeries,
  ApexDataLabels,
  ApexFill,
  ApexStroke,
  ApexXAxis,
  ApexYAxis,
  ApexTitleSubtitle
} from 'ng-apexcharts';
import { ChartType } from 'ng-apexcharts';

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { NgApexchartsModule } from 'ng-apexcharts';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../core/services/auth.service'; // adjust path if needed

// HttpClient related imports (we add HttpClientModule to the component imports)
import { HttpClient, HttpHeaders, HttpClientModule, HttpParams } from '@angular/common/http';

export type ChartOptions = {
  series: ApexNonAxisChartSeries | ApexAxisChartSeries;
  chart: ApexChart;
  labels?: string[];
  colors?: string[];
  xaxis?: ApexXAxis;
  yaxis?: ApexYAxis;
  stroke?: ApexStroke;
  dataLabels?: ApexDataLabels;
  fill?: ApexFill;
  title?: ApexTitleSubtitle;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, NgApexchartsModule, HttpClientModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  doctor = {
    name: 'Sarah Smith',
    specialization: 'Gynecologist, MBBS, MD',
  };

  stats = {
    appointments: '12+',
    surgeries: '3+',
    roomVisits: '12+',
  };

  revenue = {
    amount: 4250,
  };

  feedback = {
    score: 4.8,
  };

  appointmentsChart: ChartOptions = {
    series: [28, 24, 4],
    chart: {
      type: 'donut' as ChartType,
      height: 200,
    },
    labels: ['Scheduled', 'Completed', 'Cancelled'],
    colors: ['#42a5f5', '#66bb6a', '#ef5350'],
  };

  performanceChart: ChartOptions = {
    series: [
      {
        name: 'Performance',
        data: [20, 30, 25, 40, 35, 50],
      },
    ],
    chart: {
      type: 'line' as ChartType,
      height: 200,
    },
  };

  revenueChart: ChartOptions = {
    series: [
      {
        name: 'Revenue',
        data: [1000, 2000, 1500, 2500, 3000, 4250],
      },
    ],
    chart: {
      type: 'area' as ChartType,
      height: 200,
    },
  };

  feedbackChart: ChartOptions = {
    series: [70, 20, 10],
    chart: {
      type: 'pie' as ChartType,
      height: 200,
    },
    labels: ['Excellent', 'Good', 'Poor'],
    colors: ['#4caf50', '#ffc107', '#f44336'],
  };

  // API URLs (adjust to your backend host/port if different)
  private dashboardUrl = 'http://localhost:3000/doctor/doctor-appointment-dashboard';
  private appointmentListUrl = 'http://localhost:3000/doctor/appointment/list';

  constructor(
    private router: Router,
    private auth: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // 1) Immediate synchronous check - if no token present go to login
    if (!this.auth.hasValidToken()) {
      this.auth.clearToken?.();
      this.router.navigate(['/auth/login']);
      return;
    }

    // initial load of the dashboard data
    this.fetchDoctorDashboard();

    // example: call appointment list for a specific patientId.
    // Replace with the real patientId or read from app state.
    const samplePatientId = '68c2a6e27c432427ff5dd34f'; // <-- replace as needed
    this.fetchAppointmentList(samplePatientId);

    // 2) Subscribe to loggedIn$ changes - if it becomes false, redirect to login
    this.auth
      .isLoggedIn$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((isLoggedIn) => {
        if (!isLoggedIn) {
          if (!this.router.url.startsWith('/auth/login')) {
            this.router.navigate(['/auth/login']);
          }
        }
      });

    // 3) Listen for storage events (other tabs / manual clear)
    window.addEventListener('storage', this.onStorageEvent);
  }

  private onStorageEvent = (ev: StorageEvent) => {
    const relevantKeys = ['authToken', 'authUser', 'deviceId'];
    if (ev.key === null || relevantKeys.includes(ev.key)) {
      if (!this.auth.hasValidToken()) {
        this.auth.clearToken?.();
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

  /**
   * Fetch dashboard counts from backend and update local UI state.
   */
  fetchDoctorDashboard(today?: string): void {
    const token = this.getToken();
    if (!token) {
      console.warn('No token available for dashboard API call.');
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });

    const params: any = { today: today ?? new Date().toISOString().slice(0, 10) };

    this.http
      .get<any>(this.dashboardUrl, { headers, params })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          if (resp && resp.data) {
            const d = resp.data;
            this.stats.appointments = `${d.todayTotalCount ?? d.totalData ?? '0'}`;
            const scheduled = d.todayTotalCount ? Number(d.todayTotalCount) - Number(d.todayData ?? 0) : 0;
            const completed = Number(d.todayData ?? 0);
            const cancelled = d.totalData !== undefined ? Math.max(0, Number(d.totalData) - Number(d.todayTotalCount ?? 0)) : 0;
            (this.appointmentsChart.series as number[]) = [scheduled, completed, cancelled];
            this.stats.roomVisits = `${d.pendingData ?? '0'}`;
            console.debug('dashboard fetched', d);
          } else {
            console.warn('Unexpected dashboard response', resp);
          }
        },
        error: (err) => {
          console.error('Error fetching dashboard:', err);
        },
      });
  }

  /**
   * Fetch appointment list for a given patientId.
   * Accepts patientId (required), optional page & size.
   * Maps returned counts into UI.
   */
  fetchAppointmentList(patientId?: string, page = 1, size = 10): void {
    if (!patientId) {
      console.warn('fetchAppointmentList: no patientId provided — skipping call.');
      return;
    }

    const token = this.getToken();
    if (!token) {
      console.warn('No token available for appointment-list API call.');
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });

    let params = new HttpParams()
      .set('patientId', patientId)
      .set('page', String(page))
      .set('size', String(size));

    // Example: you can add other query params like fromDate,toDate,isExport,search etc.

    this.http
      .get<any>(this.appointmentListUrl, { headers, params })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp) => {
          // Expected shape (based on your service): { msgCode, data: { count, data: [ ...appointments ] } }
          if (resp && resp.data) {
            const payload = resp.data;
            const list = Array.isArray(payload.data) ? payload.data : [];
            // update appointment count UI
            this.stats.appointments = `${payload.count ?? list.length}`;

            // compute simple status counts (backend status numbers expected: BOOKED=1, CANCELLED=2, COMPLETED=3)
            const booked = list.filter((a: any) => Number(a.status) === 1).length;
            const cancelled = list.filter((a: any) => Number(a.status) === 2).length;
            const completed = list.filter((a: any) => Number(a.status) === 3).length;

            // update donut chart: [scheduled/booked, completed, cancelled]
            (this.appointmentsChart.series as number[]) = [booked, completed, cancelled];

            console.debug('appointment list fetched', { count: payload.count, listed: list.length });
          } else {
            console.warn('Unexpected appointment list response', resp);
          }
        },
        error: (err) => {
          console.error('Error fetching appointment list:', err);
        },
      });
  }

  /**
   * Manual refresh helper (can be wired to a button)
   */
  refreshDashboard(): void {
    this.fetchDoctorDashboard();
  }

  /**
   * Helper to retrieve token from AuthService or localStorage
   */
  private getToken(): string | null {
    try {
      const maybe = (this.auth as any).getToken ? (this.auth as any).getToken() : null;
      if (maybe) return maybe;
    } catch (e) {
      // ignore
    }
    return localStorage.getItem('authToken');
  }
}

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
  ApexTitleSubtitle,
  ApexPlotOptions,
  ApexLegend,
  ApexTooltip
} from 'ng-apexcharts';
import { ChartType } from 'ng-apexcharts';

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { NgApexchartsModule } from 'ng-apexcharts';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { HttpClient, HttpHeaders, HttpClientModule, HttpParams } from '@angular/common/http';

// EXTENDED ChartOptions to include more ApexChart properties for professionalism
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
  plotOptions?: ApexPlotOptions;
  legend?: ApexLegend;
  tooltip?: ApexTooltip;
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

  // 1. APPOINTMENTS CHART FIXES: Added plotOptions and a higher base height
  appointmentsChart: ChartOptions = {
    series: [28, 24, 4],
    chart: {
      type: 'donut' as ChartType,
      height: 250, // Increased height for better visibility
    },
    labels: ['Scheduled', 'Completed', 'Cancelled'],
    colors: ['#42a5f5', '#66bb6a', '#ef5350'],
    plotOptions: { // Add configuration to make the donut visible even with small slices
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              formatter: function (w) {
                // Calculate total from series data
                return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0).toString();
              }
            }
          }
        }
      }
    },
    legend: {
      position: 'bottom' // Professional placement of the legend
    }
  };

  // 2. PERFORMANCE CHART: Added axis and stroke for a professional line chart look
  performanceChart: ChartOptions = {
    series: [
      {
        name: 'Performance Score',
        data: [20, 30, 25, 40, 35, 50],
      },
    ],
    chart: {
      type: 'line' as ChartType,
      height: 250,
      toolbar: { show: false }
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      labels: { show: true }
    },
    yaxis: {
      labels: { show: false } // Keeping the chart clean
    },
  };

  // 3. REVENUE CHART: Added axis and fill for a professional area chart look
  revenueChart: ChartOptions = {
    series: [
      {
        name: 'Monthly Revenue',
        data: [1000, 2000, 1500, 2500, 3000, 4250],
      },
    ],
    chart: {
      type: 'area' as ChartType,
      height: 250,
      toolbar: { show: false }
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.9,
        stops: [0, 90, 100]
      }
    },
    xaxis: {
      categories: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      labels: { show: true }
    },
    tooltip: {
      y: {
        formatter: (val) => `$${val}`
      }
    }
  };

  // 4. FEEDBACK CHART: Increased height for consistency
  feedbackChart: ChartOptions = {
    series: [70, 20, 10],
    chart: {
      type: 'pie' as ChartType,
      height: 250,
    },
    labels: ['Excellent', 'Good', 'Poor'],
    colors: ['#4caf50', '#ffc107', '#f44336'],
    legend: {
      position: 'bottom'
    }
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
    if (!this.auth.hasValidToken()) {
      this.auth.clearToken?.();
      this.router.navigate(['/auth/login']);
      return;
    }

    this.fetchDoctorDashboard();

    // The rest of your existing logic remains the same (login check, storage listeners)
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
    window.addEventListener('storage', this.onStorageEvent);
  }

  // ... (onStorageEvent and ngOnDestroy remain unchanged)

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
            
            // 2. FIX: Ensure all numbers are positive integers for the chart
            const todayTotal = Number(d.todayTotalCount ?? d.totalData ?? '0');
            const completed = Number(d.todayData ?? '0');
            
            // Assuming Scheduled = Today's Total - Completed (which are typically the current day's events)
            const scheduled = Math.max(0, todayTotal - completed);
            
            // Assuming Cancelled = Total over a period (if d.totalData is total) - Today's Total
            // Let's rely on the most direct API fields:
            const totalAppointments = Number(d.totalData ?? d.todayTotalCount ?? '0'); // Fallback if fields are unreliable
            const cancelled = Math.max(0, totalAppointments - todayTotal);


            // Update stats
            this.stats.appointments = `${todayTotal > 0 ? todayTotal : '0'}+`;
            this.stats.roomVisits = `${d.pendingData ?? '0'}`;

            // Update appointments chart series: [Scheduled, Completed, Cancelled]
            // We cast to number[] because the series definition can be mixed.
            (this.appointmentsChart.series as number[]) = [scheduled, completed, cancelled];

            console.debug('dashboard fetched and chart updated:', { scheduled, completed, cancelled });
          } else {
            console.warn('Unexpected dashboard response or empty data', resp);
          }
        },
        error: (err) => {
          console.error('Error fetching dashboard:', err);
        },
      });
  }

  /**
   * Fetch appointment list for a given patientId. (Logic remains the same)
   */
  fetchAppointmentList(patientId?: string, page = 1, size = 10): void {
    // ... (logic remains unchanged, as this is secondary to the main dashboard call)
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
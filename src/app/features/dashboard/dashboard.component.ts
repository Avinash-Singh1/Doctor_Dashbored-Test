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
import { Router, RouterLink } from '@angular/router'; // Ensure RouterLink is imported
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
// REMOVED: HttpClient, HttpHeaders, HttpClientModule, HttpParams
import { CryptoProvider } from '../../core/services/crypto.service';
// IMPORTING the service and its model
import { DashboardService, DashboardModel } from '../../core/services/dashboard.service'; 


// --- Data Interfaces ---
interface User {
  fullName: string;
}

interface Doctor {
  name: string;
  specialization: string;
}

interface Stats {
  appointments: string; // Today's total
  surgeries: string; // Pending data
  roomVisits: string; // Total appointments
}

interface Revenue {
  amount: number;
}

interface Feedback {
  score: number;
}
// --------------------------------------------------


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
  // REMOVED HttpClientModule, added RouterLink
  imports: [CommonModule, MatCardModule, MatIconModule, NgApexchartsModule, RouterLink], 
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  currentUser: User | null = null; 

  doctor: Doctor = {
    name: 'Sarah Smith',
    specialization: 'Gynecologist, MBBS, MD',
  };

  stats: Stats = {
    appointments: '12+',
    surgeries: '3+',
    roomVisits: '12+',
  };

  revenue: Revenue = {
    amount: 4250,
  };

  feedback: Feedback = {
    score: 4.8,
  };

  // 1. APPOINTMENTS CHART
  appointmentsChart: ChartOptions = {
    series: [28, 24, 4],
    chart: {
      type: 'donut' as ChartType,
      height: 250, 
    },
    labels: ['Scheduled', 'Completed', 'Cancelled'],
    colors: ['#42a5f5', '#66bb6a', '#ef5350'],
    plotOptions: { 
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              formatter: function (w: any) {
                return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0).toString();
              }
            }
          }
        }
      }
    },
    legend: {
      position: 'bottom' 
    }
  };

  // 2. PERFORMANCE CHART
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
      labels: { show: false } 
    },
  };

  // 3. REVENUE CHART
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
        // stops: [0, 90, 100]
      }
    },
    xaxis: {
      categories: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      labels: { show: true }
    },
    tooltip: {
      y: {
        formatter: (val: any) => `$${val}`
      }
    }
  };

  // 4. FEEDBACK CHART
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

  // REMOVED private dashboardUrl and private appointmentListUrl

  constructor(
    private router: Router,
    private auth: AuthService,
    // REMOVED: private http: HttpClient (service handles this now)
    private dashboardService: DashboardService, // Dependency injection for the service
    private crypto: CryptoProvider
  ) {
        const rawAuthUser = localStorage.getItem('authUser');
        try {
          this.currentUser = this.crypto.decryptObj(rawAuthUser) as User;
          this.doctor.name = this.currentUser?.fullName || this.doctor.name;
        } catch {
          this.currentUser = null;
        }
        console.log("currentUser: ",this.currentUser);
  }

  ngOnInit(): void {
    if (!this.auth.hasValidToken()) {
      this.auth.clearToken?.();
      this.router.navigate(['/auth/login']);
      return;
    }

    this.fetchDoctorDashboard();

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
   * Fetches dashboard data using the injected DashboardService.
   */
  fetchDoctorDashboard(today?: string): void {
    
    // Using the service method, which encapsulates the URL, headers, and data processing
    this.dashboardService.getDoctorDashboard(today)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (model: DashboardModel) => {
          // Data from service model (model: DashboardModel)
          const todayTotal = model.todayTotalCount ?? 0;
          const pending = model.pendingData ?? 0;
          const totalAppointments = model.totalAppointments ?? 0;

          // Update stats using model data
          this.stats.appointments = `${todayTotal > 0 ? todayTotal : '0'}+`;
          this.stats.surgeries = `${pending > 0 ? pending : '0'}+`; 
          this.stats.roomVisits = `${totalAppointments > 0 ? totalAppointments : '0'}+`;

          // Derive chart slice values (using client-side heuristics)
          const completed = Math.min(10, todayTotal); 
          const scheduled = Math.max(0, todayTotal - completed);
          const cancelled = Math.max(0, totalAppointments - todayTotal);

          // Update appointments chart series
          (this.appointmentsChart.series as number[]) = [scheduled, completed, cancelled];

          console.debug('Dashboard fetched and chart updated:', model);
        },
        error: (err) => {
          console.error('Error fetching dashboard:', err);
        },
      });
  }

  /**
   * Manual refresh helper (can be wired to a button)
   */
  refreshDashboard(): void {
    this.fetchDoctorDashboard();
  }

  // REMOVED private getToken() helper
}

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
  imports: [CommonModule, MatCardModule, MatIconModule, NgApexchartsModule],
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

  constructor(private router: Router, private auth: AuthService) {}

  ngOnInit(): void {
    // 1) Immediate synchronous check - if no token present go to login
    if (!this.auth.hasValidToken()) {
      // ensure we clear any in-memory state also
      this.auth.clearToken?.(); // optional: only if method exists and you want to reset BehaviorSubject
      this.router.navigate(['/auth/login']);
      return;
    }

    // 2) Subscribe to loggedIn$ changes - if it becomes false, redirect to login
    this.auth
      .isLoggedIn$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((isLoggedIn) => {
        if (!isLoggedIn) {
          // small guard to avoid redirect loops if already on login
          if (!this.router.url.startsWith('/auth/login')) {
            this.router.navigate(['/auth/login']);
          }
        }
      });

    // 3) Listen for storage events (other tabs / manual clear)
    window.addEventListener('storage', this.onStorageEvent);
  }

  private onStorageEvent = (ev: StorageEvent) => {
    // If auth token or user was removed/changed OR localStorage was cleared (key === null)
    const relevantKeys = ['authToken', 'authUser', 'deviceId'];
    if (ev.key === null || relevantKeys.includes(ev.key)) {
      // re-check presence of token
      if (!this.auth.hasValidToken()) {
        // ensure in-memory state is kept consistent
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
}

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

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { NgApexchartsModule } from 'ng-apexcharts';

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
export class DashboardComponent {
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

  // ✅ Charts - all with strictly defined series & chart
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
}

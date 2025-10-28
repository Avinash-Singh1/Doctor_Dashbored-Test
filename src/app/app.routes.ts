import { Routes } from '@angular/router';
import { authRoutes } from './auth/auth.routes';
import { dashboardRoutes } from './features/dashboard/dashboard.routes';
import { DashboardLayoutComponent } from './core/layouts/dashboard-layout/dashboard-layout.component';
import { AuthLayoutComponent } from './core/layouts/auth-layout/auth-layout.component';
import { LandingComponent } from './features/landing/landing.component';

export const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: authRoutes
  },
  {
    path: 'landing',
    component: LandingComponent,
  },
  {
    path: '',
    component: DashboardLayoutComponent,
    children: dashboardRoutes
  },
  { path: '**', redirectTo: 'auth/login' }
];

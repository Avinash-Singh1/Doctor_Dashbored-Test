// src/app/core/services/dashboard.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

// ----------------------------------------------------------------------
// IMPORT ENVIRONMENT CONFIGURATION
// ----------------------------------------------------------------------
import { environment } from '../../../environments/environment'; 
// NOTE: Adjust the relative path '../../../environments/environment' 
// if your environment files are located differently relative to this service file.

/**
 * Shape of the raw API response.data (adjust fields to match your backend)
 */
export interface RawDashboardResponse {
  todayTotalCount?: number | string;
  totalData?: number | string;
  pendingData?: number | string;
  // add any other fields returned by your API
}

/**
 * Shape of processed dashboard info the component wants
 */
export interface DashboardModel {
  todayTotalCount: number;
  totalAppointments: number;
  pendingData: number;
  // raw data for extra flexibility
  raw?: RawDashboardResponse;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  // Use the baseUrl from the environment file (localhost or production IP)
  private readonly BASE_URL = environment.baseUrl;

  // Construct the full URLs using the base URL
  private readonly DASHBOARD_URL = `${this.BASE_URL}/doctor/doctor-appointment-dashboard`;
  private readonly APPOINTMENT_LIST_URL = `${this.BASE_URL}/doctor/appointment/list`;

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  private buildHeaders(): HttpHeaders {
    // Safely retrieve token
    const token = (this.auth as any)?.getToken ? (this.auth as any).getToken() : localStorage.getItem('authToken');
    const headersConfig: { [k: string]: string } = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headersConfig['Authorization'] = `Bearer ${token}`;
    }
    return new HttpHeaders(headersConfig);
  }

  /**
   * Fetches the dashboard from backend and returns a processed model.
   * `today` expected in YYYY-MM-DD format; if omitted, server will decide or set today client-side.
   */
  getDoctorDashboard(today?: string): Observable<DashboardModel> {
    const headers = this.buildHeaders();
    let params = new HttpParams();
    
    // Set 'today' param
    if (today) {
      params = params.set('today', today);
    } else {
      // Default to today's date in YYYY-MM-DD format
      params = params.set('today', new Date().toISOString().slice(0, 10));
    }

    // Use the dynamic DASHBOARD_URL
    return this.http.get<any>(this.DASHBOARD_URL, { headers, params }).pipe(
      map((resp) => {
        const d: RawDashboardResponse = resp?.data ?? {};
        
        // Data processing/coercion to number
        const todayTotalCount = Number(d.todayTotalCount ?? d.totalData ?? 0) || 0;
        const totalAppointments = Number(d.totalData ?? d.todayTotalCount ?? 0) || 0;
        const pendingData = Number(d.pendingData ?? 0) || 0;

        return {
          todayTotalCount,
          totalAppointments,
          pendingData,
          raw: d
        } as DashboardModel;
      }),
      catchError((err) => {
        // Centralized error handling
        console.error('DashboardService.getDoctorDashboard error', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Fetch paginated appointment list (adjust return type to your API)
   */
  getAppointmentList(patientId?: string, page = 1, size = 10): Observable<any> {
    const headers = this.buildHeaders();
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    if (patientId) params = params.set('patientId', patientId);

    // Use the dynamic APPOINTMENT_LIST_URL
    return this.http.get<any>(this.APPOINTMENT_LIST_URL, { headers, params }).pipe(
      catchError((err) => {
        console.error('DashboardService.getAppointmentList error', err);
        return throwError(() => err);
      })
    );
  }

  // OPTIONAL: small caching layer example
  private dashboardCache?: { expires: number; data: DashboardModel };
  getDoctorDashboardCached(today?: string, ttlMs = 30_000): Observable<DashboardModel> {
    const now = Date.now();
    // Check cache
    if (this.dashboardCache && this.dashboardCache.expires > now) {
      return of(this.dashboardCache.data);
    }
    // Fetch and update cache
    return this.getDoctorDashboard(today).pipe(
      map((data) => {
        this.dashboardCache = { expires: now + ttlMs, data };
        return data;
      })
    );
  }
}
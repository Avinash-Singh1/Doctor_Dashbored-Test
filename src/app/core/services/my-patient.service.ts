import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, Observable, map } from 'rxjs';
import { CryptoProvider } from '../../core/services/crypto.service';

// --- Interfaces ---

export interface Appointment {
  date: Date | string;
  doctorName: string;
  slotTime: number;
  status: number;
}

export interface Patient {
  _id: string;
  patientName?: string;
  phone?: string;
  gender?: number | null;
  email?: string;
  dob?: number | string | null;
  bloodGroup?: number | null;
  // other optional fields
}

// Explicit type for the profile status constants (Fixes the strict index signature error)
export interface ProfileStatus {
    APPROVE: 'APPROVE';
    PENDING: 'PENDING';
    DEACTIVATE: 'DEACTIVATE';
    DELETE: 'DELETE';
    REJECT: 'REJECT';
}

// --- Service ---

@Injectable({
  providedIn: 'root',
})
export class MyPatientService {
  // Constants and Maps (Moved from Component)
  private readonly API_BASE = 'http://localhost:3000';
  private readonly ENDPOINTS = {
    doctorList: '/doctor/list',
    patientProfile: '/doctor/record',
    patientAppointmentList: '/doctor/appointment/list',
  };

  // Profile Status is now strongly typed
  public readonly PROFILE_STATUS: ProfileStatus = {
    APPROVE: 'APPROVE',
    PENDING: 'PENDING',
    DEACTIVATE: 'DEACTIVATE',
    DELETE: 'DELETE',
    REJECT: 'REJECT',
  };

  private readonly genderMap: Record<string, string> = { '1': 'Male', '2': 'Female', '3': 'Other' };
  private readonly bloodGroupMap: Record<string, string> = {
    '1': 'A+', '2': 'A-', '3': 'B+', '4': 'B-',
    '5': 'O+', '6': 'O-', '7': 'AB+', '8': 'AB-',
  };

  constructor(private http: HttpClient, private crypto: CryptoProvider) {}

  // --- Token Management and Headers ---

  public getToken(): string | null {
    try {
      const enc =
        window.localStorage.getItem('authToken') ||
        window.localStorage.getItem('token');

      if (!enc) return null;

      const decrypted = this.crypto.decryptObj(enc);

      if (typeof decrypted === 'string') {
        return decrypted;
      }

      if (decrypted && typeof decrypted === 'object' && decrypted.token) {
        return decrypted.token;
      }

      return null;
    } catch (err) {
      console.error('Failed to decrypt token', err);
      return null;
    }
  }

  private buildHeaders(): HttpHeaders {
    const token = this.getToken();
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  // --- Data Fetching Methods ---

  public async getPatientProfiles(): Promise<Patient[]> {
    const headers = { headers: this.buildHeaders() };
    const listUrl = `${this.API_BASE}${this.ENDPOINTS.doctorList}?page=1&size=100&type=2`;

    try {
      const rawList: any = await firstValueFrom(this.http.get(listUrl, headers));
      const patientList: any[] = rawList?.result?.data || rawList?.data?.data || rawList?.data || rawList?.result || rawList || [];

      const profilePromises: Promise<any>[] = [];
      const minimalProfiles: Patient[] = [];

      for (const element of patientList) {
        if (Array.isArray(element.documents)) {
          for (const doc of element.documents) {
            const patientId = doc._id || doc.patientId;
            
            if (patientId) {
              const profileUrl = `${this.API_BASE}${this.ENDPOINTS.patientProfile}?patientId=${patientId}`;
              profilePromises.push(firstValueFrom(this.http.get(profileUrl, headers)));
            }

            minimalProfiles.push({
              _id: doc._id || doc.patientId || '',
              patientName: doc.patientName || element.patientName || 'Unknown',
              phone: doc.phone || element.phone || '',
              gender: doc.gender ?? element.gender ?? null,
              email: doc.email || '',
              dob: doc.dob || null,
              bloodGroup: doc.bloodGroup ?? null,
            });
          }
        }
      }

      const settled = await Promise.allSettled(profilePromises);
      const patientDetails: Patient[] = [];

      settled.forEach((entry) => {
        if (entry.status === 'fulfilled') {
          const val: any = (entry as PromiseFulfilledResult<any>).value;
          const profileObj = val?.result || val?.data || val;
          if (profileObj?._id || profileObj?.patientName) {
            patientDetails.push(profileObj);
          } else if (profileObj?.result && (profileObj.result._id || profileObj.result.patientName)) {
            patientDetails.push(profileObj.result);
          } else if (profileObj) {
            patientDetails.push(profileObj);
          }
        } else {
          console.error('Profile fetch failed:', (entry as PromiseRejectedResult).reason);
        }
      });

      return patientDetails.length > 0 ? patientDetails : minimalProfiles;

    } catch (err) {
      console.error('Error fetching patient list:', err);
      return []; 
    }
  }

  public getAppointments(patientId: string): Observable<Appointment[]> {
    const headers = { headers: this.buildHeaders() };
    const url = `${this.API_BASE}${this.ENDPOINTS.patientAppointmentList}?patientId=${patientId}`;

    return this.http.get<any>(url, headers).pipe(
      map(res => {
        const data = res?.result?.data.data ?? res?.data.data ?? [];
        if (Array.isArray(data) && data.length > 0) {
          return data.map((a: any) => ({
            ...a,
            date: a.date ? new Date(a.date) : new Date(),
          })) as Appointment[];
        }
        return [];
      })
    );
  }

  // --- Helper Methods ---

  public getGender(g: number | string | null | undefined): string {
    const key = g == null ? '' : String(g);
    return this.genderMap[key] || 'N/A';
  }

  public getBloodGroup(b: number | string | null | undefined): string {
    const key = b == null ? '' : String(b);
    return this.bloodGroupMap[key] || 'N/A';
  }

  public getAppointmentStatus(status: number): string {
    switch (status) {
      case 0: return 'BOOKED';
      case 1: return 'COMPLETE';
      case 2: return 'PENDING';
      case -1: return 'CANCEL';
      case -2: return 'RESCHEDULE';
      default: return 'UNKNOWN';
    }
  }
}
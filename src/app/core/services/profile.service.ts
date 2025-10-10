import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin, Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { CryptoProvider } from '../../core/services/crypto.service';

// --- Type Constants ---
const API_BASE_URL = 'http://localhost:8080/api/v1';
const SETTINGS_URL = `${API_BASE_URL}/setting/list`;
const USER_TYPE = 2;

// API Type constants for SETTINGS_URL payload
export const SETTING_TYPE = {
  EDUCATION: 1,
  AWARD: 2,
  MEMBERSHIP: 4,
  SOCIAL: 8,
};

// --- Interfaces for Clean Data Structure ---

export interface Specialization {
  _id: string;
  name: string;
}

export interface Education {
  _id?: string;
  degree: string;
  college: string;
  year: string;
}

export interface Award {
  _id?: string;
  name: string;
  year: string;
}

export interface Membership {
  _id?: string;
  name: string;
}

// Ensure this is exported
export interface SocialMediaMaster { 
  _id: string;
  name: string;
  logo?: string;
}

export interface SocialLink {
  _id?: string;
  socialMediaId: string;
  name: string; // resolved name from master list
  url: string;
}

export interface DoctorProfileData {
  profile: any; // Raw data for the main profile section
  specializationList: Specialization[];
  educationList: Education[];
  awardList: Award[];
  membershipList: Membership[];
  socialList: SocialLink[];
  socialTypes: SocialMediaMaster[];
}

// --- Service ---
@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private currentUser: any;

  constructor(
    private http: HttpClient,
    private crypto: CryptoProvider
  ) {
    const rawAuthUser = localStorage.getItem('authUser');
    this.currentUser = rawAuthUser ? this.crypto.decryptObj(rawAuthUser) : null;
  }

  private getAuthHeaders(): HttpHeaders {
    const token =
      (typeof localStorage !== 'undefined' && this.crypto.decryptObj(localStorage.getItem('authToken'))) ||
      '';
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  private get<T>(url: string): Observable<T> {
    return this.http.get<T>(url, { headers: this.getAuthHeaders() }).pipe(
      catchError((err) => {
        console.error(`API GET failed for ${url}`, err);
        return throwError(() => err);
      })
    );
  }

  private put<T>(payload: any): Observable<T> {
    return this.http.put<T>(SETTINGS_URL, payload, { headers: this.getAuthHeaders() }).pipe(
      catchError((err) => {
        console.error(`API PUT failed for ${SETTINGS_URL}`, err);
        return throwError(() => err);
      })
    );
  }

  public loadAllProfileData(): Observable<DoctorProfileData> {
    const profile$ = this.get<any>(`${API_BASE_URL}/setting/profile`);
    const edu$ = this.get<any>(`${API_BASE_URL}/setting/list?type=${SETTING_TYPE.EDUCATION}`);
    const awards$ = this.get<any>(`${API_BASE_URL}/setting/list?type=${SETTING_TYPE.AWARD}`);
    const members$ = this.get<any>(`${API_BASE_URL}/setting/list?type=${SETTING_TYPE.MEMBERSHIP}`);
    const socialList$ = this.get<any>(`${API_BASE_URL}/setting/list?type=${SETTING_TYPE.SOCIAL}`);
    const socialTypes$ = this.get<any>(`${API_BASE_URL}/master/social-media`);
    const specialization$ = this.get<any>(`${API_BASE_URL}/master/specialization`);

    return forkJoin({ profile$, edu$, awards$, members$, socialList$, socialTypes$, specialization$ }).pipe(
      map(({ profile$, edu$, awards$, members$, socialList$, socialTypes$, specialization$ }) => {
        return {
          profile: (profile$?.result ?? [])[0] ?? {},
          specializationList: (specialization$?.result?.data || []).map((it: any) => ({ _id: it._id, name: it.name })),
          educationList: (edu$?.result?.list || []).map((e: any) => ({ _id: e._id, degree: e.degree, college: e.college, year: e.year })),
          awardList: (awards$?.result?.list || []).map((a: any) => ({ _id: a._id, name: a.name, year: a.year })),
          membershipList: (members$?.result?.list || []).map((m: any) => ({ _id: m._id, name: m.name })),
          socialTypes: (socialTypes$?.result?.data || []).map((s: any) => ({ _id: s._id, name: s.name, logo: s.logo })),
          socialList: (socialList$?.result?.list || []).map((s: any) => ({
            _id: s._id,
            socialMediaId: s.socialMediaId,
            name: s.name,
            url: s.url,
          })),
        } as DoctorProfileData;
      })
    );
  }

  public updateProfileSetting(type: number, isEdit: boolean, records: any): Observable<any> {
    const payload = {
      type,
      isEdit,
      records,
    };
    return this.put(payload);
  }

  public requestOtp(phone: string): Observable<any> {
    const url = `${API_BASE_URL}/registration/changePhone`;
    const body = { phone, countryCode: "+91", userType: USER_TYPE };
    return this.http.post<any>(url, body, { headers: this.getAuthHeaders() });
  }

  public verifyOtp(phone: string, otp: string): Observable<any> {
    const url = `${API_BASE_URL}/registration/changePhoneVerify`;
    const userId = this.currentUser?._id;
    if (!userId) {
      return throwError(() => new Error('User ID missing for OTP verification.'));
    }

    const payload = {
      phone,
      userId,
      otp,
      userType: USER_TYPE,
    };
    return this.http.post<any>(url, payload, { headers: this.getAuthHeaders() });
  }

  public updateMainProfile(formData: any): Observable<any> {
    const url = `${API_BASE_URL}/setting/profile`; 
    return this.http.put<any>(url, formData, { headers: this.getAuthHeaders() }).pipe(
        catchError((err) => {
            console.error('Failed to update main profile', err);
            return throwError(() => err);
        })
    );
  }
}
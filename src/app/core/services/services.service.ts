import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, map, switchMap, catchError, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
// --- Interfaces for Data Structure ---

export interface ServiceItem {
  _id: string;
  name: string;
  specialization: string; // The specialization name
  isCustom?: boolean; // Helper flag for services added by the doctor
}

export interface Specialization {
  _id: string;
  name: string;
}

export interface DoctorProfile {
  specializationIds: string[];
  specializationNames: string[];
}

export interface DoctorSettingListItem {
  _id: string; // The ID of the doctor's record for this service
  name: string; // The name of the service
  type: number; // Should be 5 for services
}


// --- API CONSTANTS ---
const BASE_URL = `${environment.baseUrl2}/api`;
const API_ENDPOINTS = {
  COMMON: {
    getAllServices: '/v1/services/get-all-services',
  },
  MASTER: {
    specialization: '/v1/master/specialization',
  },
  doctor: {
    updateDoctorProfile: '/v1/setting/profile',
    settingList: '/v1/setting/list',
  },
};
// NOTE: Ideally, the token should come from an AuthService.
const BEARER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzBmY2QxNjFmYWI2NDEwOTgyNjQxMmEiLCJ1c2VyVHlwZSI6MiwiZnVsbE5hbWUiOiJEci4gRCBEaGFuYW1qYXlhIiwiaWF0IjoxNzU5NTU5NDQ3LCJleHAiOjE3NjAxNjQyNDd9.vu80EnV_QtzepytHxfiTaGE17bG8U1rkNVEdSeRMNEw';

// --- ApiService Wrapper ---
@Injectable({
  providedIn: 'root'
})
class ApiService {
  private headers: HttpHeaders;

  constructor(private http: HttpClient) {
    this.headers = new HttpHeaders({
      'Authorization': `Bearer ${BEARER_TOKEN}`
    });
  }

  get(endpoint: string, params: any = {}): Observable<any> {
    const url = BASE_URL + endpoint;
    return this.http.get(url, { headers: this.headers, params: params });
  }

  put(endpoint: string, body: any): Observable<any> {
    const url = BASE_URL + endpoint;
    return this.http.put(url, body, { headers: this.headers });
  }
}

// --- Main Service ---
@Injectable({
  providedIn: 'root'
})
export class ServicesService {

  constructor(private apiService: ApiService) { }

  private loadDoctorSpecialization(allSpecializations: Specialization[]): Observable<DoctorProfile> {
    return this.apiService.get(API_ENDPOINTS.doctor.updateDoctorProfile).pipe(
      map((res: any) => {
        const specializationIds: string[] = res?.result?.[0]?.doctor?.specialization || [];

        const specializationNames: string[] = allSpecializations
          .filter(spec => specializationIds.includes(spec._id))
          .map(spec => spec.name);

        return { specializationIds, specializationNames };
      }),
      catchError(err => {
        console.error('Error fetching doctor specializations:', err);
        return throwError(() => new Error('Failed to load doctor specializations.'));
      })
    );
  }

  public loadAllData(): Observable<{
    allDisplayServices: ServiceItem[],
    doctorSelectedServices: DoctorSettingListItem[]
  }> {
    const allSpecializations$ = this.apiService.get(API_ENDPOINTS.MASTER.specialization).pipe(
      map((res: any) => res?.result?.data || []),
      catchError(err => of([]))
    );

    return allSpecializations$.pipe(
      switchMap((allSpecs: Specialization[]) => {
        const doctorProfile$ = this.loadDoctorSpecialization(allSpecs);
        const masterServices$ = this.apiService.get(API_ENDPOINTS.COMMON.getAllServices).pipe(
          map((res: any) => res.result || []),
        );
        const doctorSettings$ = this.apiService.get(API_ENDPOINTS.doctor.settingList + "?type=5").pipe(
          map((res: any) => res?.result?.list || []),
        );

        return forkJoin({
          profile: doctorProfile$,
          masterServices: masterServices$,
          doctorSettings: doctorSettings$,
        });
      }),
      map(data => {
        const doctorSpecializationNames = data.profile.specializationNames;
        let allServices: ServiceItem[] = data.masterServices;
        const doctorSelectedServices: DoctorSettingListItem[] = data.doctorSettings;

        // 1. Filter master services based on the doctor's specialization names
        if (doctorSpecializationNames && allServices.length > 0) {
          allServices = allServices.filter(service =>
            doctorSpecializationNames.includes(service.specialization)
          );
        }

        // 2. Merge selected services (especially custom ones) into the main list for display
        doctorSelectedServices.forEach(selectedService => {
          const serviceExists = allServices.some(existingService =>
            existingService.name === selectedService.name
          );
          if (!serviceExists) {
            allServices.push({ 
                _id: '',
                name: selectedService.name, 
                specialization: 'Custom', 
                isCustom: true 
            });
          }
        });

        return {
          allDisplayServices: allServices,
          doctorSelectedServices: doctorSelectedServices
        };
      })
    );
  }
  
  public addService(serviceName: string): Observable<any> {
    const body = {
      type: 5,
      isEdit: false,
      isDeleted: false,
      records: { name: serviceName },
    };
    return this.apiService.put(API_ENDPOINTS.doctor.settingList, body);
  }

  public deleteService(doctorRecordId: string): Observable<any> {
    const endpoint = API_ENDPOINTS.doctor.settingList + "/?recordId=" + doctorRecordId;
    const body = {
      type: 5,
      isEdit: true,
      isDeleted: true,
    };
    return this.apiService.put(endpoint, body);
  }

  public isServiceSelected(serviceName: string, selectedList: DoctorSettingListItem[]): boolean {
    return selectedList.some(s => s.name === serviceName);
  }
}
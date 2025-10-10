import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, map, switchMap, catchError, throwError } from 'rxjs';
import { CryptoProvider } from '../../core/services/crypto.service'; // Assuming this path is correct for your real CryptoProvider
// NOTE: Replace ApiServiceMock and ToastrServiceMock imports and usage with your real services.

// --- Interface for Procedure Data
export interface Procedure {
  _id: string;
  name: string;
  specializationId: string;
  // Add other fields if they exist
}

// --- Interface for the Doctor's Procedure List Item
export interface DoctorProcedureListItem {
  _id: string; // The ID of the doctor's record for this procedure
  procedureId: string; // The ID of the actual procedure from the master list
  // Add other fields if they exist
}

// --- API Endpoints Configuration
const API_BASE_URL = 'http://localhost:8080/api/v1';
const API_ENDPOINTS = {
  MASTER: {
    procedure: '/master/procedure',
  },
  doctor: {
    updateDoctorProfile: '/setting/profile',
    procedures: '/doctor/procedure',
  }
};

// --- Mockup of ApiService and ToastrService (for dependency) ---
// Since the original component included these mock services, I'm integrating the HttpClient logic directly here,
// which is a more standard service pattern. If you have an application-wide ApiService, you should inject that instead.

@Injectable({
  providedIn: 'root'
})
class ApiServiceMock {
  private baseHeaders: HttpHeaders;

  constructor(private http: HttpClient, private crypto: CryptoProvider) {
      const rawAuthUser = localStorage.getItem('authToken');
      // Decrypt the token - keeping the logic from your component
      const MOCK_TOKEN = this.crypto.decryptObj(rawAuthUser);
      // NOTE: This token should be fetched dynamically from your AuthService or storage.
      this.baseHeaders = new HttpHeaders().set('Authorization', `Bearer ${MOCK_TOKEN}`);
  }

  get(endpoint: string): Observable<any> {
    return this.http.get(`${API_BASE_URL}${endpoint}`, { headers: this.baseHeaders });
  }

  post(endpoint: string, body: any): Observable<any> {
    return this.http.post(`${API_BASE_URL}${endpoint}`, body, { headers: this.baseHeaders });
  }

  delete(endpoint: string, id: string): Observable<any> {
    // Assuming DELETE uses the path parameter {id}
    return this.http.delete(`${API_BASE_URL}${endpoint}/${id}`, { headers: this.baseHeaders });
  }
}

// --- Real Procedure Service ---

@Injectable({
  providedIn: 'root'
})
export class ProcedureService {

  // Inject the ApiService (or your real HttpClient wrapper) and any other dependencies
  constructor(private apiService: ApiServiceMock) { } 

  /**
   * Fetches the doctor's profile to get specialization IDs, then fetches the master procedure list.
   * Filters the master list based on specialization IDs.
   * Finally, fetches the doctor's currently selected procedure list.
   * @returns An observable that emits an array of DoctorProcedureListItem (the selected procedures).
   */
  public loadInitialData(): Observable<{ 
    allMasterProcedures: Procedure[], 
    doctorProcedureList: DoctorProcedureListItem[] 
  }> {
    // 1. Get Profile to get Specialization IDs
    const profile$ = this.apiService.get(API_ENDPOINTS.doctor.updateDoctorProfile).pipe(
      map((res: any) => res?.result?.[0]?.doctor?.specialization || []),
      catchError(err => {
        console.error('Error fetching profile:', err);
        return throwError(() => new Error('Error fetching profile'));
      })
    );

    // 2. Use specialization IDs to fetch and filter master procedures
    return profile$.pipe(
      switchMap((specializationIds: string[]) => {
        // 3. Get Master Procedure List
        const masterProcedures$ = this.apiService.get(API_ENDPOINTS.MASTER.procedure).pipe(
          map((res: any) => {
            const all: Procedure[] = res?.result?.data || [];
            
            // Apply the specialization filter logic from the component
            const allMasterProcedures = (all.length > 0 && specializationIds.length > 0)
              ? all.filter((procedure: Procedure) => specializationIds.includes(procedure.specializationId))
              : all;
              
            return allMasterProcedures;
          }),
          catchError(err => {
            console.error('Error fetching master procedures:', err);
            return throwError(() => new Error('Error fetching master procedures'));
          })
        );

        // 4. Get Doctor's Procedure List
        const doctorProcedures$ = this.apiService.get(API_ENDPOINTS.doctor.procedures).pipe(
          map((res: any) => res?.result?.list || []),
          catchError(err => {
            console.error('Error fetching doctor procedures:', err);
            return throwError(() => new Error('Error fetching doctor procedures'));
          })
        );

        // 5. Combine and return the necessary data
        return forkJoin({
          allMasterProcedures: masterProcedures$,
          doctorProcedureList: doctorProcedures$,
        });
      })
    );
  }

  /**
   * Adds a new procedure to the doctor's list.
   * @param procedureId The ID of the procedure to add.
   */
  public addProcedure(procedureId: string): Observable<any> {
    const body = {
      type: 9,
      isEdit: false,
      records: { recordId: procedureId },
    };
    return this.apiService.post(API_ENDPOINTS.doctor.procedures, body);
  }

  /**
   * Deletes a procedure from the doctor's list.
   * @param doctorProcedureId The _id of the record in the doctor's procedure list (not the master procedure ID).
   */
  public deleteProcedure(doctorProcedureId: string): Observable<any> {
    return this.apiService.delete(API_ENDPOINTS.doctor.procedures, doctorProcedureId);
  }

  /**
   * Maps the doctor's selected list to the master list to get a filtered view.
   * NOTE: The component's original logic was slightly confusing (filtering master list for specialization, then filtering that
   * again for selected). The new component will handle the final filter on display.
   * This service method is kept for completeness but simplified.
   * @param masterList The full list of procedures relevant to the doctor.
   * @param selectedList The doctor's list of selected procedures.
   * @returns An array of Procedures that the doctor has currently selected.
   */
  public filterSelectedProcedures(
    masterList: Procedure[], 
    selectedList: DoctorProcedureListItem[]
  ): Procedure[] {
    const selectedProcedureIds = selectedList.map(p => p.procedureId);
    
    // Filter the master list (already specialization-filtered by loadInitialData)
    // to show only the ones the doctor has selected.
    return masterList.filter((procedure: Procedure) =>
      selectedProcedureIds.includes(procedure._id)
    );
  }
}
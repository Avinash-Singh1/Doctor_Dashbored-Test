// src/app/features/procedure/procedure.component.ts
import { Component, OnInit, OnDestroy, Renderer2, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms'; // Required for [(ngModel)]
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http'; // Required for API calls
import { Subject, takeUntil } from 'rxjs';
import { CryptoProvider } from '../../core/services/crypto.service';

// NOTE: You would typically import your real AuthService here
// import { AuthService } from '../../core/services/auth.service';

// --- Interface for Procedure Data (Good practice for typing)
interface Procedure {
  _id: string;
  name: string;
  specializationId: string;
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

// --- Mockup of ApiService and ToastrService (Now using @Injectable) ---
// **IMPORTANT**: Replace these with your real, application-wide services.

@Injectable({
  providedIn: 'root' // Or provided in this component's providers array
})
class ApiServiceMock {
  private baseHeaders: HttpHeaders;

  constructor(private http: HttpClient,private crypto: CryptoProvider) {
      const rawAuthUser = localStorage.getItem('authToken');
      const MOCK_TOKEN = this.crypto.decryptObj(rawAuthUser);
    // NOTE: This token should be fetched dynamically from your AuthService or storage.
    // const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NTcxNmQ1NjFlZWNlMmZmNDc5ZmJhMDkiLCJ1c2VyVHlwZSI6MiwiZGV2aWNlSWQiOiIxMjM0NTYiLCJkZXZpY2VUeXBlIjoiZGVza3RvcCIsImRldmljZVRva2VuIjoiZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SjBiMnRsYmw5MGVYQmxJam9pWVdOalpYTnpJaXdpWlhod0lqb3hOalk1TmpReE5UVTNMQ0pwWVhRaU9qRTJOamsxTlRVeE5UY3NJbXAwYVNJNklqUmlZMkl6TVRWbU0yTTJNelF3WWpZNU16TTRORGRtWWpJd05EazBOVFV5SWl3aWRYTmxjbDlwWkNJNklqSXhNREExWW1ZeExUVXpNREV0TkRreU1TMWlNRE0xTFdZeE1UbGhOVEpqTnpWbU1TSjkubG91VkVMYkFNV3pwVW9OeGhiRjMtYmlsQkZXVVVKZzRsc1RYQUlCaWU2SSIsImJyb3dzZXIiOiJjaHJvbWUiLCJvcyI6IndpbmRvd3MiLCJ0b2tlblR5cGUiOjEsImZ1bGxOYW1lIjoiRHIuIERhcnNoIEdveWFsIiwiaWF0IjoxNzU5NTcwMjc2LCJleHAiOjE3NjAxNzUwNzZ9.qdF6-b9Cxe50kcNZOfX5JT2Dn75qGKOj22zDQIabXzs';
    this.baseHeaders = new HttpHeaders().set('Authorization', `Bearer ${MOCK_TOKEN}`);
  }

  get(endpoint: string) {
    return this.http.get(`${API_BASE_URL}${endpoint}`, { headers: this.baseHeaders });
  }

  post(endpoint: string, body: any) {
    return this.http.post(`${API_BASE_URL}${endpoint}`, body, { headers: this.baseHeaders });
  }

  delete(endpoint: string, id: string) {
    // Assuming DELETE uses the path parameter {id}
    return this.http.delete(`${API_BASE_URL}${endpoint}/${id}`, { headers: this.baseHeaders });
  }
}

@Injectable({
  providedIn: 'root'
})
class ToastrServiceMock {
  success(message: string): void { console.log('SUCCESS:', message); }
  error(message: string): void { console.log('ERROR:', message); }
}

// -----------------------------------------------------------------------------------

@Component({
  selector: 'app-procedure',
  standalone: true,
  // Ensure all modules/directives used in HTML are imported
  imports: [CommonModule, FormsModule, RouterLink, HttpClientModule], 
  templateUrl: './procedure.component.html',
  styleUrls: ['./procedure.component.scss'],
  // Use the mock services with real dependency injection structure
  providers: [
    ApiServiceMock,
    ToastrServiceMock,
    // If you uncommented the real AuthService, ensure it's provided here too
  ]
})
export class ProcedureComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // --- Component State (Properties that were missing and causing NG9 errors) ---
  procedureList: any[] = [];
  allProcedures: Procedure[] = []; // Used in the modal dropdown
  filteredProcedures: Procedure[] = []; // Used in the main list
  selectedProcedureId: string | null = '';
  profileSpecilizationIds: string[] = [];
  
  // --- Services ---
  // The actual services injected by their class type
  constructor(
    private router: Router, 
    // private auth: AuthService, // Uncomment if you are using your real auth service
    private renderer: Renderer2,
    // Inject the mock services (or replace with your real ones)
    private apiService: ApiServiceMock,
    public toastr: ToastrServiceMock,
  ) {}

  // --- Life Cycle Hooks ---
  ngOnInit(): void {
    // Start the data flow
    this.getProfile(); 
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // window.removeEventListener('storage', this.onStorageEvent); 
  }

  // --- Data Fetching and Logic (The methods that were missing) ---

  getProfile() {
    this.apiService
      .get(API_ENDPOINTS.doctor.updateDoctorProfile)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.profileSpecilizationIds = res?.result?.[0]?.doctor?.specialization || [];
          this.masterProcedureList();
        },
        error: (err) => console.error('Error fetching profile:', err)
      });
  }

  masterProcedureList() {
    this.apiService
      .get(API_ENDPOINTS.MASTER.procedure)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const all: Procedure[] = res?.result?.data || [];
          this.filteredProcedures=res?.result?.data;
          
          if (all.length > 0 && this.profileSpecilizationIds.length > 0) {
            this.allProcedures = all.filter((procedure: Procedure) =>
              this.profileSpecilizationIds.includes(procedure._id)
            );
          } else {
             this.allProcedures = all;
          }
          
          this.getProcedureList(); 
        },
        error: (err) => console.error('Error fetching master procedures:', err)
      });
  }

  getProcedureList() {
    this.apiService
      .get(API_ENDPOINTS.doctor.procedures)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.procedureList = res?.result?.list || [];
          // this.filterProcedures();
        },
        error: (err) => console.error('Error fetching doctor procedures:', err)
      });
  }

  filterProcedures() {
    const selectedProcedureIds = this.procedureList.map(
      (p: { procedureId: string; }) => p.procedureId
    );
    
    // Filter the specialization-filtered master list
    this.filteredProcedures = this.allProcedures.filter((procedure: Procedure) =>
      selectedProcedureIds.includes(procedure._id)
    );
  }
  
  // --- Template-Invoked Methods (Missing methods that caused NG9 errors) ---

  onProcedureChange(event: any, procedure: Procedure) {
    if (event.target.checked) {
      // Logic for adding (re-enabling) the procedure
      this.apiService.post(API_ENDPOINTS.doctor.procedures, {
        type: 9,
        isEdit: false,
        records: { recordId: procedure._id },
      }).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => this.getProcedureList(),
        error: (err) => console.error('Error re-enabling procedure:', err)
      });
    } else {
      // Logic for removing/deleting the procedure
      const procedureToRemove = this.procedureList.find(p => p.procedureId === procedure._id);
      if (procedureToRemove && procedureToRemove._id) {
        this.apiService.delete(API_ENDPOINTS.doctor.procedures, procedureToRemove._id)
          .pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
              this.toastr.success("Procedure Deleted");
              this.getProcedureList();
            },
            error: (err) => console.error('Error deleting procedure:', err)
          });
      }
    }
  }

  addProcedure() {
    if (this.selectedProcedureId) {
      this.apiService.post(API_ENDPOINTS.doctor.procedures, {
        type: 9,
        isEdit: false,
        records: { recordId: this.selectedProcedureId },
      }).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.getProcedureList();
          this.toastr.success("Procedure Added");
          this.closeModal('add_procedures_modal');
          this.selectedProcedureId = '';
        },
        error: (err) => console.error('Error adding procedure:', err)
      });
    } else {
      this.toastr.error("Please Select a procedure");
    }
  }

  isProcedureSelected(procedureId: string): boolean {
    // Checks if the procedure is already in the doctor's selected list
    return this.procedureList.some(selected => selected.procedureId === procedureId);
  }
  
  // --- UI/Renderer Methods ---

  onMenuClick() {
    const sideMenu = document.getElementById("sideMenu");
    const innerArea = document.getElementById("clickToCloseArea");
    if (sideMenu && innerArea) {
      const isMobileMenu = sideMenu.classList.contains("mobileMenu");
      const isSideBarOpened = innerArea.classList.contains("openedSideBar");

      if (isMobileMenu && isSideBarOpened) {
        this.renderer.removeClass(sideMenu, "mobileMenu");
        this.renderer.removeClass(innerArea, "openedSideBar");
      } else {
        this.renderer.addClass(sideMenu, "mobileMenu");
        this.renderer.addClass(innerArea, "openedSideBar");
      }
    }
  }

  closeSideBar() {
    const innerArea = document.getElementById("clickToCloseArea");
    const sideMenu = document.getElementById("sideMenu");
    if (innerArea?.classList.contains("openedSideBar")) {
      this.renderer.removeClass(innerArea, "openedSideBar");
      this.renderer.removeClass(sideMenu, "mobileMenu");
    }
  }

  openModal(modalId: string): void {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      this.renderer.addClass(modalElement, "show");
      this.renderer.addClass(modalElement, "d-block");
      this.renderer.setAttribute(modalElement, "aria-modal", "true");
      this.renderer.setAttribute(modalElement, "role", "dialog");
    }
  }

  closeModal(modalId: string): void {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      this.renderer.removeClass(modalElement, "show");
      this.renderer.removeClass(modalElement, "d-block");
      this.renderer.removeAttribute(modalElement, "aria-modal");
      this.renderer.removeAttribute(modalElement, "role");
      this.selectedProcedureId = ''; // Reset selection on close
    }
  }
}
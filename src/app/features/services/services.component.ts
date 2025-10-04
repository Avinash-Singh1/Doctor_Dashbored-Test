// src/app/features/services/services.component.ts

import { Component, OnInit, OnDestroy, Renderer2 } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, firstValueFrom } from 'rxjs';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { FormBuilder } from '@angular/forms'; 

// --- API CONSTANTS ---
const BASE_URL = 'http://localhost:8080/api';
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
const BEARER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzBmY2QxNjFmYWI2NDEwOTgyNjQxMmEiLCJ1c2VyVHlwZSI6MiwiZnVsbE5hbWUiOiJEci4gRCBEaGFuYW1qYXlhIiwiaWF0IjoxNzU5NTU5NDQ3LCJleHAiOjE3NjAxNjQyNDd9.vu80EnV_QtzepytHxfiTaGE17bG8U1rkNVEdSeRMNEw';
// const BEARER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGRjZTA1MDA0YTFkODQ3MGNhNDJmOTgiLCJ1c2VyVHlwZSI6MiwiZnVsbE5hbWUiOiJNci4gQXZpbmFzaCIsImlhdCI6MTc1OTQ4NjAyMywiZXhwIjoxNzYwMDkwODIzfQ.LuD_H0sz9ZKtRflFEaOQzO2BdwzmIOP3XEHjQ5BMCrE';
// ----------------------


// Helper class to encapsulate API logic and headers
class ApiService {
  private headers: HttpHeaders;

  constructor(private http: HttpClient) {
    this.headers = new HttpHeaders({
      'Authorization': `Bearer ${BEARER_TOKEN}`
    });
  }

  // Generic GET request (used with firstValueFrom)
  get(endpoint: string, params: any = {}) {
    const url = BASE_URL + endpoint;
    return this.http.get(url, { headers: this.headers, params: params });
  }

  // Generic PUT request (used with firstValueFrom)
  put(endpoint: string, body: any) {
    const url = BASE_URL + endpoint;
    return this.http.put(url, body, { headers: this.headers });
  }
}

// NOTE: Since your original logic uses the .subscribe() style, 
// we will expose the Observable directly for onServiceChange and saveList.

@Component({
  selector: 'app-services',
  standalone: true,
  // Ensure all required modules are imported
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule, NgFor, NgIf],
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.scss'],
})
export class ServicesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private apiService: ApiService; 

  // Data properties
  servicesList: any[] = [];
  allServicesList: any[] = [];
  specializationList: any;
  doctorSpecializationIds: any;
  doctorSpecializationNames: any;
  newService: string = '';
  isSubmenuOpen: boolean = false;
  
  // Other component properties
  selectedSerivceId:any;
  profileSpecializations: any;
  profileSpecializationsNames:any;
  filteredServices: any[] = [];
  selectedService:any;
  showDropdown = true;
  addfilteredServices: any;
  doctorSpecilization: any;
  allSpecializationList:any;

  // Since you are using firstValueFrom, we need HttpClient
  constructor(
    private renderer: Renderer2,
    private router: Router,
    private fb: FormBuilder, 
    private http: HttpClient // Injected for real API calls
  ) {
     // Initialize the real ApiService
     this.apiService = new ApiService(this.http);
  }

  // --- Initialization ---

  async ngOnInit(): Promise<void> {
    // If you are using a global error handler or interceptor, 
    // real API errors will show up here.
    await this.loadInitialData();
  }
  
  async loadInitialData(): Promise<void> {
      console.log("Starting data fetch...");
      try {
          // Sequential calls using await
          await this.loadSpecializations(); 
          await this.getServicesList(); 
          await this.getListing(); 
          console.log("Component Initialized successfully.");
      } catch (error) {
          // CRITICAL: Catch real API errors here and log them
          console.error("Failed to load initial data from API:", error);
          // You might want to display a user-friendly error message here
      }
  }


  // --- Data Loading & Filtering (Using real firstValueFrom) ---

  async loadSpecializations(): Promise<void> {
    const res: any = await firstValueFrom(this.apiService.get(API_ENDPOINTS.MASTER.specialization));
    this.specializationList = res?.result?.data || [];
    
    await this.loadDoctorSpecialization();
  }

  async loadDoctorSpecialization(): Promise<void> {
    const res: any = await firstValueFrom(this.apiService.get(API_ENDPOINTS.doctor.updateDoctorProfile));
    // Assuming the response structure is correct based on your previous code
    this.doctorSpecializationIds = res?.result?.[0]?.doctor?.specialization || []; 
    
    this.mapSpecializationNames();
  }

  mapSpecializationNames(): void {
    if (!this.specializationList || !this.doctorSpecializationIds) {
      return;
    }
    
    this.doctorSpecializationNames = this.specializationList
      .filter((specialization: any) => 
        this.doctorSpecializationIds.includes(specialization._id)
      )
      .map((specialization: any) => specialization.name);
  }

  async getServicesList(): Promise<void> {
    const res: any = await firstValueFrom(this.apiService.get(API_ENDPOINTS.COMMON.getAllServices));
    this.allServicesList = res.result || [];

    // Filter services based on the doctor's specializations
    if (this.doctorSpecializationNames && this.allServicesList.length > 0) {
      this.allServicesList = this.allServicesList.filter(service => 
        this.doctorSpecializationNames.includes(service.specialization)
      );
    }
  }

  async getListing(): Promise<void> {
    // This fetches the currently selected services
    const res: any = await firstValueFrom(this.apiService.get(API_ENDPOINTS.doctor.settingList + "?type=5"));
    this.servicesList = res?.result?.list || [];

    // Merge selected services (especially custom ones) into the main list for display
    if (this.servicesList) {
      this.servicesList.forEach(service => {
        const serviceExists = this.allServicesList.some(existingService => 
          existingService.name === service.name
        );
        if (!serviceExists) {
          this.allServicesList.push(service);
        }
      });
    }
  }
  
  isServiceSelected(service: any): boolean {
    return this.servicesList.some((s: any) => s.name === service.name);
  }


  // --- Event Handlers & API Calls (Using .subscribe() as per your original request) ---

  onServiceChange(event: any, service: any) {
    if (!event.target.checked) {
      // DELETE/REMOVE service
      const matchedService = this.servicesList.find((s: any) => s.name === service.name);
      
      // Use the actual HttpClient Observable with .subscribe()
      this.apiService.put(API_ENDPOINTS.doctor.settingList + "/?recordId=" + matchedService?._id, {
        type: 5,
        isEdit: true,
        isDeleted: true,
      }).subscribe({
        next: () => {
          console.log("Service Deleted Successfully"); 
          // You should replace console.log with this.toastr.success("Service Deleted");
          this.getListing(); 
          
          if (!service.specialization || service.specialization === 'Custom') {
             this.allServicesList = this.allServicesList.filter(ser => ser.name !== service.name);
          }
        },
        error: (err) => console.error("Error deleting service:", err)
      });
    } else {
      // ADD service
      this.apiService.put(API_ENDPOINTS.doctor.settingList, {
        type: 5,
        isEdit: false,
        isDeleted: false,
        records: { name: service.name },
      }).subscribe({
        next: () => {
          console.log("Service Added Successfully");
          // You should replace console.log with this.toastr.success("Service Added");
          this.getListing(); 
        },
        error: (err) => console.error("Error adding service:", err)
      });
    }
  }

  async saveList() : Promise<void>{
    this.apiService
      .put(API_ENDPOINTS.doctor.settingList, {
        type: 5,
        isEdit: false,
        records: { name: this.newService },
      })
      .subscribe({
        next: async (res: any) => {
          if (res?.success) {
            await this.getListing(); 
            this.newService = '';
            console.log("Service Added via Modal Successfully");
            // You should replace console.log with this.toastr.success("Service Added");
            this.closeModal('add_services_modal')
          }
        },
        error: (err) => console.error("Error saving new service:", err)
      });
  }

  // --- UI/Interactivity Logic (Unchanged) ---

  settingtoggleSubmenu(event: Event): void {
    event.preventDefault(); 
    this.isSubmenuOpen = !this.isSubmenuOpen; 
  }
  
  selectService(service: any) {
    this.newService = service.name;
    this.showDropdown = false;
  }
  
  onMenuClick() {
    const sideMenu = document.getElementById("sideMenu");
    const innerArea = document.getElementById("clickToCloseArea");
    if (sideMenu && innerArea) {
      const isMobileMenu = sideMenu.classList.contains("mobileMenu") && innerArea.classList.contains("openedSideBar");
      if (isMobileMenu) {
        this.renderer.removeClass(sideMenu, "mobileMenu");
        this.renderer.removeClass(innerArea, "openedSideBar");
      } else {
        this.renderer.addClass(sideMenu, "mobileMenu");
        this.renderer.addClass(innerArea, "openedSideBar");
      }
    }
  }

  closeSideBar(){
    const innerArea = document.getElementById("clickToCloseArea");
    const sideMenu = document.getElementById("sideMenu");
    if (innerArea && sideMenu && innerArea.classList.contains("openedSideBar")) {
      this.renderer.removeClass(innerArea, "openedSideBar");
      this.renderer.removeClass(sideMenu, "mobileMenu");
    } 
  }

  onCloseMenuClick() {
     this.closeSideBar();
  }

  openModal(modalId: string): void {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      this.renderer.addClass(modalElement, "show");
      this.renderer.addClass(modalElement, "d-block");
      this.renderer.setAttribute(modalElement, "aria-modal", "true");
      this.renderer.setAttribute(modalElement, "role", "dialog");
      this.renderer.setStyle(document.body, 'overflow', 'hidden'); 
    }
  }

  closeModal(modalId: string): void {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      this.renderer.removeClass(modalElement, "show");
      this.renderer.removeClass(modalElement, "d-block");
      this.renderer.removeAttribute(modalElement, "aria-modal");
      this.renderer.removeAttribute(modalElement, "role");
      this.renderer.setStyle(document.body, 'overflow', 'auto'); 
    }
    this.newService = '';
  }

  toggleSubmenu(event: Event): void {
     this.settingtoggleSubmenu(event);
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
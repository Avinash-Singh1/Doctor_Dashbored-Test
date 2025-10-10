// src/app/features/my-patient/my-patient.component.ts
import { Component, OnInit, OnDestroy, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { HttpClientModule } from '@angular/common/http';

// Import the service, interfaces, and ProfileStatus
import { MyPatientService, Patient, Appointment, ProfileStatus  } from '../../core/services/my-patient.service';
@Component({
  selector: 'app-my-patient',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './my-patient.component.html',
  styleUrls: ['./my-patient.component.scss'],
})
export class MyPatientComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  hideView = false;
  searchQuery = '';
  currentName = '';
  filteredPatientDetails: Patient[] = [];
  appointmentList: Appointment[] = [];
  patientDetails: Patient[] = []; 
  isSubmenuOpen = false;

  // Properties to hold service constants and bound helper functions.
  // Using the non-null assertion operator (!) since they are guaranteed 
  // to be initialized in ngOnInit.
  private PROFILE_STATUS!: ProfileStatus; 
  public getGender!: (g: number | string | null | undefined) => string;
  public getBloodGroup!: (b: number | string | null | undefined) => string;
  public getStatus!: (status: number) => string;

  // Inject the service
  constructor(
    private renderer: Renderer2,
    private router: Router,
    private patientService: MyPatientService // Dependency Injection
  ) {}

  ngOnInit(): void {
    // FIX: Initialize ALL service-dependent properties here
    this.PROFILE_STATUS = this.patientService.PROFILE_STATUS;
    
    // FIX: Bind helper functions here to avoid "used before initialized" error
    this.getGender = this.patientService.getGender.bind(this.patientService);
    this.getBloodGroup = this.patientService.getBloodGroup.bind(this.patientService);
    this.getStatus = this.patientService.getAppointmentStatus.bind(this.patientService);

    // Initial checks and data load
    const token = this.patientService.getToken();
    if (!token) {
      window.localStorage.removeItem('authToken');
      this.router.navigate(['/auth/login']);
      return;
    }

    this.loadPatientData();

    const approvalStatus = window.localStorage.getItem('approvalStatus');
    
    // Use dot notation, which is now safe due to strong typing (ProfileStatus)
    if (approvalStatus === this.PROFILE_STATUS.APPROVE) { 
      this.hideView = false;
      this.loadPatientData(); 
    } else {
      this.hideView =
        approvalStatus === this.PROFILE_STATUS.PENDING ||
        approvalStatus === this.PROFILE_STATUS.DEACTIVATE ||
        approvalStatus === this.PROFILE_STATUS.DELETE ||
        approvalStatus === this.PROFILE_STATUS.REJECT;
    }

    window.addEventListener('storage', this.onStorageEvent);
  }

  /**
   * Loads the patient data using the service.
   */
  async loadPatientData(): Promise<void> {
    try {
      this.patientDetails = await this.patientService.getPatientProfiles();
      this.filteredPatientDetails = [...this.patientDetails];
    } catch (e) {
      console.error('Failed to load patient data:', e);
      this.patientDetails = [];
      this.filteredPatientDetails = [];
    }
  }

  /**
   * Fetches appointment details for a selected patient using the service.
   */
  getDetails(item: Patient) {
    if (!item || !item._id) {
      console.warn('getDetails called with invalid item', item);
      return;
    }

    this.currentName = item.patientName || 'Patient';

    this.patientService.getAppointments(item._id)
      .pipe(takeUntil(this.destroy$)) 
      .subscribe({
        next: (data) => {
          this.appointmentList = data;
          this.openModal('details');
        },
        error: (err) => {
          console.error('Error fetching appointments', err);
          this.appointmentList = [];
          this.openModal('details');
        },
      });
  }

  /**
   * Filters the patient list (Client-side logic).
   */
  filterPatients() {
    if (!this.searchQuery || !this.searchQuery.trim()) {
      this.filteredPatientDetails = [...this.patientDetails];
      return;
    }
    const q = this.searchQuery.toLowerCase();
    this.filteredPatientDetails = this.patientDetails.filter((p) => {
      const name = (p.patientName || '').toLowerCase();
      const phone = (p.phone || '').toString();
      return name.includes(q) || phone.includes(this.searchQuery);
    });
  }

  // --- UI/DOM Manipulation Methods ---

  openModal(id: string) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('show', 'd-block');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('role', 'dialog');
    }
  }

  closeModal(id: string) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('show', 'd-block');
      modal.removeAttribute('aria-modal');
      modal.removeAttribute('role');
    }
  }

  settingtoggleSubmenu(event: Event) {
    event.preventDefault();
    this.isSubmenuOpen = !this.isSubmenuOpen;
  }

  onMenuClick() {
    const sideMenu = document.getElementById('sideMenu');
    const innerArea = document.getElementById('clickToCloseArea');
    if (sideMenu && innerArea) {
      this.renderer.addClass(sideMenu, 'mobileMenu');
      this.renderer.addClass(innerArea, 'openedSideBar');
    }
  }

  closeSideBar() {
    const sideMenu = document.getElementById('sideMenu');
    const innerArea = document.getElementById('clickToCloseArea');
    if (sideMenu && innerArea) {
      this.renderer.removeClass(sideMenu, 'mobileMenu');
      this.renderer.removeClass(innerArea, 'openedSideBar');
    }
  }

  onCloseMenuClick() {
    const sideMenu = document.getElementById('sideMenu');
    if (sideMenu) {
      this.renderer.removeClass(sideMenu, 'mobileMenu');
    }
  }

  // --- Cleanup ---

  private onStorageEvent = (ev: StorageEvent) => {
    const relevantKeys = ['authToken', 'authUser', 'deviceId', 'token'];
    if (ev.key === null || relevantKeys.includes(ev.key)) {
      const token = this.patientService.getToken(); 
      if (!token) {
        window.localStorage.removeItem('authToken');
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
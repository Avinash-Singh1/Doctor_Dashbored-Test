// src/app/features/procedure/procedure.component.ts
import { Component, OnInit, OnDestroy, Renderer2, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms'; 
import { HttpClientModule } from '@angular/common/http'; 
import { Subject, takeUntil, finalize } from 'rxjs'; // Import finalize for clean up
import { ProcedureService, Procedure, DoctorProcedureListItem } from '../../core/services/procedure.service';

// --- Mockup of ToastrService (for direct component usage) ---
// If you have a real ToastrService, use that instead.
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
  imports: [CommonModule, FormsModule, RouterLink, HttpClientModule], 
  templateUrl: './procedure.component.html',
  styleUrls: ['./procedure.component.scss'],
  // Only ToastrServiceMock is needed here, as ApiService is now injected into ProcedureService
  providers: [
    ProcedureService, // Ensure the new service is available
    ToastrServiceMock, 
  ]
})
export class ProcedureComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // --- Component State ---
  // The doctor's currently selected procedures (includes their ID for deletion)
  procedureList: DoctorProcedureListItem[] = []; 
  
  // The master list of procedures (filtered by specialization, used in the modal dropdown)
  allProcedures: Procedure[] = []; 
  
  // The procedures currently displayed in the main grid (selected procedures mapped to master data)
  filteredProcedures: Procedure[] = []; 
  
  selectedProcedureId: string | null = ''; // For the dropdown in the modal
  
  // No longer needed: profileSpecilizationIds is managed internally by the service
  // profileSpecilizationIds: string[] = [];
  
  // --- Services ---
  constructor(
    private router: Router, 
    private renderer: Renderer2,
    private procedureService: ProcedureService, // New Service
    public toastr: ToastrServiceMock,
  ) {}

  // --- Life Cycle Hooks ---
  ngOnInit(): void {
    // Start the data flow from the service
    this.loadProcedures();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- Data Fetching and Logic (Refactored) ---

  loadProcedures(): void {
    // The service now handles fetching the profile, master list, filtering, and doctor's list in a single call.
    this.procedureService.loadInitialData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.allProcedures = data.allMasterProcedures; // Master procedures (specialization-filtered)
          this.procedureList = data.doctorProcedureList; // Doctor's selected list (for add/delete logic)
          
          // Use the service's filter function to update the display list
          this.filteredProcedures = this.procedureService.filterSelectedProcedures(
            this.allProcedures,
            this.procedureList
          );
        },
        error: (err) => console.error('Error loading procedures:', err)
      });
  }

  // --- Template-Invoked Methods (Refactored) ---

  onProcedureChange(event: any, procedure: Procedure) {
    if (event.target.checked) {
      // Logic for adding (re-enabling) the procedure
      this.procedureService.addProcedure(procedure._id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => this.loadProcedures(), // Reload all data to ensure everything is up-to-date
          error: (err) => console.error('Error re-enabling procedure:', err)
        });
    } else {
      // Logic for removing/deleting the procedure
      const procedureToRemove = this.procedureList.find(p => p.procedureId === procedure._id);
      
      if (procedureToRemove && procedureToRemove._id) {
        this.procedureService.deleteProcedure(procedureToRemove._id) // Use the doctor's record ID
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastr.success("Procedure Deleted");
              this.loadProcedures(); // Reload the lists
            },
            error: (err) => console.error('Error deleting procedure:', err)
          });
      }
    }
  }

  addProcedure() {
    if (this.selectedProcedureId) {
      this.procedureService.addProcedure(this.selectedProcedureId)
        .pipe(
          takeUntil(this.destroy$),
          // Use finalize to ensure state is reset even on error
          finalize(() => {
            this.selectedProcedureId = ''; 
            this.closeModal('add_procedures_modal');
          })
        )
        .subscribe({
          next: () => {
            this.toastr.success("Procedure Added");
            this.loadProcedures(); // Reload the lists
          },
          error: (err) => {
            console.error('Error adding procedure:', err);
            this.toastr.error("Failed to add procedure");
          }
        });
    } else {
      this.toastr.error("Please Select a procedure");
    }
  }

  isProcedureSelected(procedureId: string): boolean {
    // Checks if the procedure is already in the doctor's selected list
    return this.procedureList.some(selected => selected.procedureId === procedureId);
  }
  
  // --- UI/Renderer Methods (Unchanged) ---
  
  // ... (onMenuClick, closeSideBar, openModal, closeModal methods remain here)

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
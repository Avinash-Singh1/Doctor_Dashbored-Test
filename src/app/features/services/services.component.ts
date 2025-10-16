import { Component, OnInit, OnDestroy, Renderer2, Injectable } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { HttpClientModule } from '@angular/common/http';
import { ServicesService, ServiceItem, DoctorSettingListItem }  from '../../core/services/services.service';

// --- Mockup of ToastrService ---
@Injectable({
  providedIn: 'root'
})
class ToastrServiceMock {
  success(message: string): void { console.log('SUCCESS:', message); }
  error(message: string): void { console.log('ERROR:', message); }
}
// ----------------------

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule, NgFor, NgIf],
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.scss'],
  providers: [
    ServicesService, 
    ToastrServiceMock,
  ]
})
export class ServicesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // --- Data properties (FIXED NAME) ---
  // This replaces allServicesList and filteredServices for the display grid
  allDisplayServices: ServiceItem[] = []; 
  
  // The doctor's actual selected service list (for add/delete logic)
  doctorSelectedServices: DoctorSettingListItem[] = []; 
  
  newService: string = ''; // For the modal input
  
  // UI properties
  isSubmenuOpen: boolean = false;
  showDropdown = true;
  
  constructor(
    private renderer: Renderer2,
    private router: Router,
    private servicesService: ServicesService,
    private toastr: ToastrServiceMock,
  ) {}

  // --- Initialization ---

  ngOnInit(): void {
    this.loadInitialData();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- Data Loading Logic ---

  loadInitialData(): void {
    this.servicesService.loadAllData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.allDisplayServices = data.allDisplayServices;
          this.doctorSelectedServices = data.doctorSelectedServices;
          console.log("Services loaded successfully.: ",data);
        },
        error: (err) => {
          console.error("Failed to load initial data:", err);
          this.toastr.error("Failed to load services. Please try again.");
        }
      });
  }
  
  isServiceSelected(service: ServiceItem): boolean {
    return this.servicesService.isServiceSelected(service.name, this.doctorSelectedServices);
  }

  // --- Event Handlers & API Calls ---

  onServiceChange(event: any, service: ServiceItem) {
    if (!event.target.checked) {
      // DELETE/REMOVE service
      const matchedService = this.doctorSelectedServices.find(s => s.name === service.name);
      
      if (matchedService?._id) {
        this.servicesService.deleteService(matchedService._id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastr.success("Service Deleted Successfully");
              this.loadInitialData(); 
            },
            error: (err) => console.error("Error deleting service:", err)
          });
      }
      
    } else {
      // ADD service
      this.servicesService.addService(service.name)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastr.success("Service Added Successfully");
            this.loadInitialData();
          },
          error: (err) => console.error("Error adding service:", err)
        });
    }
  }

  saveList() : void {
    if (!this.newService) {
      this.toastr.error("Please enter a service name.");
      return;
    }

    this.servicesService.addService(this.newService)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success("Service Added via Modal Successfully");
          this.newService = '';
          this.closeModal('add_services_modal');
          this.loadInitialData();
        },
        error: (err) => {
          console.error("Error saving new service:", err);
          this.toastr.error("Failed to add new service.");
        }
      });
  }

  // --- UI/Interactivity Logic (Kept as originally provided) ---

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
}
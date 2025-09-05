import { CommonModule } from '@angular/common';
import { Component, OnInit, Renderer2 } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-services',
   imports: [CommonModule,FormsModule],
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.scss']
})
export class ServicesComponent implements OnInit {
  servicesList: any[] = [];
  allServicesList: any[] = [];
  specializationList: any[] = [];
  doctorSpecializationIds: string[] = [];
  doctorSpecializationNames: string[] = [];

  selectedService: any;
  newService: string = '';
  showDropdown: boolean = true;
  isSubmenuOpen: boolean = false;

  constructor(private renderer: Renderer2) {}

  ngOnInit(): void {
    this.loadSpecializations();
    this.loadDoctorSpecialization();
    this.getServicesList();
    this.getListing();
  }

  // ✅ Hardcoded data instead of API
  loadSpecializations(): void {
    this.specializationList = [
      { _id: '1', name: 'Cardiology' },
      { _id: '2', name: 'Dermatology' },
      { _id: '3', name: 'Orthopedics' },
    ];
  }

  loadDoctorSpecialization(): void {
    this.doctorSpecializationIds = ['1', '3']; // doctor specializes in Cardiology + Orthopedics
    this.mapSpecializationNames();
  }

  mapSpecializationNames(): void {
    this.doctorSpecializationNames = this.specializationList
      .filter((spec) => this.doctorSpecializationIds.includes(spec._id))
      .map((spec) => spec.name);
  }

  getServicesList(): void {
    const allServices = [
      { _id: 's1', name: 'Heart Checkup', specialization: 'Cardiology' },
      { _id: 's2', name: 'Skin Treatment', specialization: 'Dermatology' },
      { _id: 's3', name: 'Bone Surgery', specialization: 'Orthopedics' },
      { _id: 's4', name: 'General Consultation', specialization: 'Cardiology' },
    ];

    // Filter only services that match doctor specialization
    this.allServicesList = allServices.filter((s) =>
      this.doctorSpecializationNames.includes(s.specialization)
    );
  }

  getListing(): void {
    // Initially selected services (doctor already has these)
    this.servicesList = [
      { _id: 's1', name: 'Heart Checkup', specialization: 'Cardiology' }
    ];

    // Merge into allServicesList if not already there
    this.servicesList.forEach((service) => {
      if (!this.allServicesList.some((s) => s.name === service.name)) {
        this.allServicesList.push(service);
      }
    });
  }

  selectService(service: any): void {
    this.newService = service.name;
    this.showDropdown = false;
  }

  saveList(): void {
    if (this.newService) {
      const newServiceObj = { _id: 'new' + Date.now(), name: this.newService };
      this.servicesList.push(newServiceObj);
      this.allServicesList.push(newServiceObj);
      this.newService = '';
      this.showDropdown = true;
      alert('Service Added ✅');
    }
  }

  onServiceChange(event: any, service: any): void {
    if (!event.target.checked) {
      // remove service
      this.servicesList = this.servicesList.filter((s) => s._id !== service._id);
      alert('Service Removed ❌');
    } else {
      // add service
      this.servicesList.push(service);
      alert('Service Added ✅');
    }
  }

  isServiceSelected(service: any): boolean {
    return this.servicesList.some((s) => s.name === service.name);
  }

  // Menu + Modal logic (simplified)
  toggleSubmenu(event: Event): void {
    event.preventDefault();
    this.isSubmenuOpen = !this.isSubmenuOpen;
  }

  openModal(modalId: string): void {
    const modal = document.getElementById(modalId);
    modal?.classList.add('show', 'd-block');
  }

  closeModal(modalId: string): void {
    const modal = document.getElementById(modalId);
    modal?.classList.remove('show', 'd-block');
  }
}

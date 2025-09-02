import { Component, OnInit, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';   // ✅ for *ngIf, *ngFor, date pipe, ngClass
import { FormsModule } from '@angular/forms';     // ✅ for [(ngModel)]
import { RouterModule } from '@angular/router';   // ✅ for routerLink

// Appointment interface
interface Appointment {
  date: Date;
  doctorName: string;
  slotTime: number;
  status: number;
}

// Patient interface
interface Patient {
  _id: string;
  patientName: string;
  phone: string;
  gender: number;
  email: string;
  dob: number | null;
  bloodGroup: number;
}

@Component({
  selector: 'app-my-patient',
  standalone: true,   // ✅ standalone
  imports: [CommonModule, FormsModule, RouterModule], // ✅ add required imports
  templateUrl: './my-patient.component.html',
  styleUrls: ['./my-patient.component.scss'],
})
export class MyPatientComponent implements OnInit {
  hideView = false;
  searchQuery = '';
  currentName: string = '';
  filteredPatientDetails: Patient[] = [];
  appointmentList: Appointment[] = [];
  isSubmenuOpen = false;

  genderList: Record<number, string> = { 1: 'Male', 2: 'Female', 3: 'Other' };
  bloodGroupList: Record<number, string> = {
    1: 'A+',
    2: 'A-',
    3: 'B+',
    4: 'B-',
    5: 'O+',
    6: 'O-',
    7: 'AB+',
    8: 'AB-',
  };

  // Hardcoded patient list
  patientDetails: Patient[] = [
    {
      _id: 'p1',
      patientName: 'John Doe',
      phone: '9876543210',
      gender: 1,
      email: 'john@example.com',
      dob: 28,
      bloodGroup: 1,
    },
    {
      _id: 'p2',
      patientName: 'Jane Smith',
      phone: '9123456780',
      gender: 2,
      email: 'jane@example.com',
      dob: 32,
      bloodGroup: 3,
    },
  ];

  // Hardcoded appointment history
  allAppointments: Record<string, Appointment[]> = {
    p1: [
      {
        date: new Date('2023-12-10T10:30:00'),
        doctorName: 'Dr. Adams',
        slotTime: 30,
        status: 1,
      },
      {
        date: new Date('2023-11-15T14:00:00'),
        doctorName: 'Dr. Brown',
        slotTime: 45,
        status: 0,
      },
    ],
    p2: [
      {
        date: new Date('2023-12-12T09:00:00'),
        doctorName: 'Dr. Clark',
        slotTime: 20,
        status: -1,
      },
    ],
  };

  constructor(private renderer: Renderer2) {}

  ngOnInit(): void {
    this.filteredPatientDetails = this.patientDetails;
  }

  filterPatients() {
    if (!this.searchQuery.trim()) {
      this.filteredPatientDetails = this.patientDetails;
    } else {
      this.filteredPatientDetails = this.patientDetails.filter(
        (patient) =>
          patient.patientName
            .toLowerCase()
            .includes(this.searchQuery.toLowerCase()) ||
          patient.phone.includes(this.searchQuery)
      );
    }
  }

  getStatus(status: number): string {
    switch (status) {
      case 0:
        return 'BOOKED';
      case 1:
        return 'COMPLETE';
      case 2:
        return 'PENDING';
      case -1:
        return 'CANCEL';
      case -2:
        return 'RESCHEDULE';
      default:
        return 'UNKNOWN';
    }
  }

  getDetails(item: Patient) {
    this.currentName = item.patientName;
    this.appointmentList = this.allAppointments[item._id] || [];
    this.openModal('details');
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

  openModal(id: string) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('show', 'd-block');
    }
  }

  closeModal(id: string) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('show', 'd-block');
    }
  }
}

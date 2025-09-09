import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

interface TimeSlot {
  from: string;
  to: string;
}

interface HospitalAddress {
  city?: string;
  state?: string;
  pincode?: string;
}

interface HospitalData {
  name: string;
  address: HospitalAddress;
}

interface Establishment {
  _id: string;
  hospitalData: HospitalData;
  mon?: TimeSlot[];
  tue?: TimeSlot[];
  wed?: TimeSlot[];
  thu?: TimeSlot[];
  fri?: TimeSlot[];
  sat?: TimeSlot[];
  sun?: TimeSlot[];
  consultationFees?: number | null;
  videoConsultationFees?: number | null;
  isDeleted?: boolean;
  isVerified?: number; // 1 pending, 2 verified
  isActive?: boolean;
}

@Component({
  selector: 'app-doctor-establishment',
  templateUrl: './doctor-establishment.component.html',
  styleUrls: ['./doctor-establishment.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class DoctorEstablishmentComponent implements OnInit {
  // UI state
  dayLabel: string | null = null;
  showDeleteModal = false;
  deleteEstablishmentData: Establishment | null = null;

  // Sample local data (self-contained)
  visitEstablishment: Establishment[] = [];
  ownEstablishment: Establishment[] = [];
  ownEstablishmentExist = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // mock data so component is usable without external services
    this.visitEstablishment = [
      {
        _id: 'v1',
        hospitalData: { name: 'City Clinic', address: { city: 'Bengaluru', state: 'KA', pincode: '560001' } },
        mon: [{ from: '09:00', to: '13:00' }, { from: '15:00', to: '18:00' }],
        tue: [{ from: '09:00', to: '13:00' }, { from: '15:00', to: '18:00' }],
        wed: [{ from: '09:00', to: '13:00' }, { from: '15:00', to: '18:00' }],
        thu: [{ from: '09:00', to: '13:00' }, { from: '15:00', to: '18:00' }],
        fri: [{ from: '09:00', to: '13:00' }, { from: '15:00', to: '18:00' }],
        sat: [{ from: '10:00', to: '14:00' }],
        sun: [],
        consultationFees: 500,
        videoConsultationFees: 300,
        isDeleted: false,
        isVerified: 2,
        isActive: true
      },
      {
        _id: 'v2',
        hospitalData: { name: 'Video Consultation Only', address: { city: 'Online', state: 'NA', pincode: '' } },
        mon: [{ from: '08:00', to: '20:00' }],
        tue: [{ from: '08:00', to: '20:00' }],
        wed: [{ from: '08:00', to: '20:00' }],
        thu: [{ from: '08:00', to: '20:00' }],
        fri: [{ from: '08:00', to: '20:00' }],
        sat: [{ from: '08:00', to: '20:00' }],
        sun: [{ from: '08:00', to: '20:00' }],
        consultationFees: -1,
        videoConsultationFees: 250,
        isDeleted: false,
        isVerified: 2,
        isActive: true
      }
    ];

    this.ownEstablishment = [
      {
        _id: 'o1',
        hospitalData: { name: 'My Clinic', address: { city: 'Mumbai', state: 'MH', pincode: '400001' } },
        mon: [{ from: '09:00', to: '17:00' }],
        tue: [{ from: '09:00', to: '17:00' }],
        wed: [{ from: '09:00', to: '17:00' }],
        thu: [{ from: '09:00', to: '17:00' }],
        fri: [{ from: '09:00', to: '17:00' }],
        sat: [],
        sun: [],
        consultationFees: 700,
        videoConsultationFees: 400,
        isDeleted: false,
        isVerified: 1, // pending
        isActive: false
      }
    ];

    this.ownEstablishmentExist = this.ownEstablishment.length > 0;
  }

  getInitial(name?: string): string {
    return name ? name.trim().charAt(0).toUpperCase() : 'D';
  }

  getStateName(code?: string): string {
    if (!code) return '';
    const map: Record<string, string> = { KA: 'Karnataka', MH: 'Maharashtra', DL: 'Delhi', TN: 'Tamil Nadu', UP: 'Uttar Pradesh', NA: '' };
    return map[code] ?? code;
  }

  getDayLabel(item: Establishment): string | null | undefined {
    if (!item) return undefined;
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
    const slots = days.map(d => JSON.stringify((item as any)[d] ?? []));
    const allEqual = slots.every(s => s === slots[0]);

    if (allEqual && slots[0] !== '[]') {
      this.dayLabel = 'All Days';
      return this.dayLabel;
    }

    const monToFri = slots.slice(0, 5).every(s => s !== '[]');
    const satSun = slots.slice(5, 7).every(s => s !== '[]');

    if (monToFri && !satSun) {
      this.dayLabel = 'Mon-Fri';
      return this.dayLabel;
    }
    if (satSun && !monToFri && slots.slice(0, 5).every(s => s === '[]')) {
      this.dayLabel = 'Sat-Sun';
      return this.dayLabel;
    }

    this.dayLabel = null;
    return this.dayLabel;
  }

  openGoogleMaps(item: Establishment): void {
    if (!item?.hospitalData?.address) return;
    const addr = item.hospitalData.address;
    const parts = [];
    if (addr.city) parts.push(addr.city);
    if (addr.state) parts.push(this.getStateName(addr.state));
    if (addr.pincode) parts.push(addr.pincode);
    const q = encodeURIComponent(parts.join(', '));
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
  }

  onChangeEstablishment(item: Establishment): void {
    item.isActive = !item.isActive;
    console.log('Toggled active:', item._id, item.isActive);
  }

  deleteEstablishment(item: Establishment): void {
    this.deleteEstablishmentData = item;
    this.showDeleteModal = true;
  }

  deleteEstablishmentConfirm(): void {
    if (!this.deleteEstablishmentData) return;
    this.deleteEstablishmentData.isDeleted = true;
    this.visitEstablishment = this.visitEstablishment.filter(e => e._id !== this.deleteEstablishmentData!._id);
    this.ownEstablishment = this.ownEstablishment.filter(e => e._id !== this.deleteEstablishmentData!._id);
    this.closeModal();
  }

  closeModal(): void {
    this.showDeleteModal = false;
    this.deleteEstablishmentData = null;
  }
}

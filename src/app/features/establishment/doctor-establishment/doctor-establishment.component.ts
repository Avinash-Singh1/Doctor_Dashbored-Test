import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient,HttpParams, HttpErrorResponse, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { CryptoProvider } from '../../../core/services/crypto.service';
import { environment } from '../../../../environments/environment';
interface TimeSlot {
  from: string;
  to: string;
  slot?: string;
  _id?: string;
}

interface HospitalAddress {
  city?: string;
  state?: string;
  pincode?: string;
  [key: string]: any;
}

interface HospitalData {
  name: string;
  address: HospitalAddress;
  profilePic?: string | null;
  [key: string]: any;
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
  isOwner?: boolean;
  [key: string]: any;
  establishmentId:any
}

@Component({
  selector: 'app-doctor-establishment',
  templateUrl: './doctor-establishment.component.html',
  styleUrls: ['./doctor-establishment.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule]
})
export class DoctorEstablishmentComponent implements OnInit {
  showDeleteModal = false;
  deleteEstablishmentData: Establishment | null = null;

  visitEstablishment: Establishment[] = [];
  ownEstablishment: Establishment[] = [];
  ownEstablishmentExist = false;

  loading = false;
  error: string | null = null;

  private readonly API_URL = `${environment.baseUrl}/doctor/doctor-establishment-list?size=100`;
  private readonly DELETE_URL = `${environment.baseUrl2}/api/v1/doctor/doctor-delete-establishment2`;
  private readonly TOKEN:any;

  // 🔑 Hardcoded token
  
  constructor(private router: Router, private http: HttpClient,private crypto: CryptoProvider) {
    this.TOKEN = this.crypto.decryptObj(localStorage.getItem('authToken'));
  }

  ngOnInit(): void {
    this.fetchEstablishments();
  }

  private fetchEstablishments(): void {
    this.loading = true;
    this.error = null;

    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.TOKEN}`
    });

    this.http.get<any>(this.API_URL, { headers }).pipe(
      catchError((err: HttpErrorResponse) => {
        const msg = err?.error?.message || err?.message || 'Failed to fetch establishments';
        this.error = msg;
        this.loading = false;
        return throwError(() => err);
      })
    ).subscribe((res) => {
      this.loading = false;
      try {
        const arr = res?.result?.data ?? [];
        const mapped: Establishment[] = arr.map((a: any) => this.mapApiToEstablishment(a));
        this.ownEstablishment = mapped.filter(e => e.isOwner === true);
        this.visitEstablishment = mapped.filter(e => e.isOwner !== true);
        this.ownEstablishmentExist = this.ownEstablishment.length > 0;
      } catch (e) {
        this.error = 'Invalid response format';
      }
    }, () => {
      this.loading = false;
      this.error = this.error ?? 'Error fetching establishments';
    });
  }

  private mapApiToEstablishment(a: any): Establishment {
    return {
      _id: a._id,
      hospitalData: {
        name: a?.hospitalData?.name ?? 'Unknown',
        address: a?.hospitalData?.address ?? {}
      },
      mon: this.normalizeSlots(a?.mon),
      tue: this.normalizeSlots(a?.tue),
      wed: this.normalizeSlots(a?.wed),
      thu: this.normalizeSlots(a?.thu),
      fri: this.normalizeSlots(a?.fri),
      sat: this.normalizeSlots(a?.sat),
      sun: this.normalizeSlots(a?.sun),
      consultationFees: (typeof a.consultationFees !== 'undefined') ? a.consultationFees : null,
      videoConsultationFees: (typeof a.videoConsultationFees !== 'undefined') ? a.videoConsultationFees : null,
      isDeleted: !!a.isDeleted,
      isVerified: typeof a.isVerified === 'number' ? a.isVerified : (a.isVerified ? Number(a.isVerified) : 0),
      isActive: typeof a.isActive === 'boolean' ? a.isActive : !!a.isActive,
      isOwner: !!a.isOwner,
      ...a
    };
  }

  private normalizeSlots(slots: any): TimeSlot[] {
    if (!slots) return [];
    return Array.isArray(slots) ? slots.map((s: any) => ({
      from: s?.from ?? '',
      to: s?.to ?? '',
      slot: s?.slot,
      _id: s?._id
    })) : [];
  }

  getInitial(name?: string): string {
    return name ? name.trim().charAt(0).toUpperCase() : 'D';
  }

  getStateName(code?: string): string {
    if (!code) return '';
    const map: Record<string, string> = {
      KA: 'Karnataka',
      MH: 'Maharashtra',
      DL: 'Delhi',
      TN: 'Tamil Nadu',
      UP: 'Uttar Pradesh',
      NA: ''
    };
    return map[code] ?? code;
  }

  getDayLabelFor(item: Establishment): string | null | undefined {
    if (!item) return undefined;
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
    const slots = days.map(d => JSON.stringify((item as any)[d] ?? []));
    const allEqual = slots.every(s => s === slots[0]);

    if (allEqual && slots[0] !== '[]') return 'All Days';

    const monToFri = slots.slice(0, 5).every(s => s !== '[]');
    const satSun = slots.slice(5, 7).every(s => s !== '[]');

    if (monToFri && !satSun) return 'Mon-Fri';
    if (satSun && !monToFri && slots.slice(0, 5).every(s => s === '[]')) return 'Sat-Sun';

    return null;
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

  // onChangeEstablishment(item: Establishment): void {
  //   item.isActive = !item.isActive;
  //   console.log('Toggled active:', item._id, item.isActive);
  //   // Optionally persist change to backend here
  // }

  private authKey: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODZmOTY1ZjI3YzEwNDg5OThjYmE0NDAiLCJ1c2VyVHlwZSI6MiwiZnVsbE5hbWUiOiJEci4gQmVqdWdhbSBLZWVydGhpa2EiLCJpYXQiOjE3NTg4Njc3NTMsImV4cCI6MTc1OTQ3MjU1M30.PfCopJOkuoKkvIaZfmGF88QQtV4eAsEuzFFPcFyVusw';

  
   onChangeEstablishment(establishment: any, event: Event): void {
    alert("Hello world")
    // Prevent unintended event bubbling
    event.stopPropagation();

    // Toggle isActive status locally (optimistic update)
    const newStatus = !establishment.isActive;

    // Build query params
    const params = new HttpParams()
      .set('establishmentId', establishment?.establishmentId)
      .set('hospitalId', establishment?.hospitalData?.hospitalId);

    // API URL
    const url = `${environment.baseUrl2}/api/v1/doctor/doctor-edit-establishment`;

    // Add headers with Bearer token
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.TOKEN}`);

    // Call API with PUT
    this.http.put(url, { isActive: newStatus }, { params, headers }).subscribe({
      next: (res: any) => {
        if (res?.success) {
          establishment.isActive = newStatus; // Update UI only if backend succeeds
          console.log('Establishment updated successfully');
        } else {
          console.error('Failed to update establishment:', res?.message);
        }
      },
      error: (error: any) => {
        console.error('Error updating establishment: ', error);
      },
    });
  }

  deleteEstablishment(item: Establishment): void {
    this.deleteEstablishmentData = item;
    this.showDeleteModal = true;
  }

  /**
   * Calls the delete API with Bearer token, then refreshes the list.
   */
  deleteEstablishmentConfirm(): void {
    if (!this.deleteEstablishmentData) return;

    this.loading = true;
    this.error = null;

    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.TOKEN}`,
      'Content-Type': 'application/json'
    });

    const payload = {
      establishmentId: this.deleteEstablishmentData.establishmentId
    };

    this.http.post<any>(this.DELETE_URL, payload, { headers }).pipe(
      catchError((err: HttpErrorResponse) => {
        const msg = err?.error?.message || err?.message || 'Failed to delete establishment';
        this.error = msg;
        this.loading = false;
        return throwError(() => err);
      })
    ).subscribe((res) => {
      this.loading = false;
      try {
        // handle success response and refresh data
        if (res?.success) {
          // close modal first
          this.closeModal();
          this.router.navigate(['/establishment']);

          // refresh the establishment list from server to reflect changes
          this.fetchEstablishments();
        } else {
          this.error = res?.message ?? 'Delete failed';
        }
      } catch (e) {
        this.error = 'Unexpected response from delete API';
      }
    }, () => {
      this.loading = false;
      this.error = this.error ?? 'Error deleting establishment';
    });
  }

  closeModal(): void {
    this.showDeleteModal = false;
    this.deleteEstablishmentData = null;
  }
}

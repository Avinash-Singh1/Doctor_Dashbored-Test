// src/app/features/my-patient/my-patient.component.ts
import { Component, OnInit, OnDestroy, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, firstValueFrom } from 'rxjs';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { CryptoProvider } from '../../core/services/crypto.service'; 

interface Appointment {
  date: Date | string;
  doctorName: string;
  slotTime: number;
  status: number;
}

interface Patient {
  _id: string;
  patientName?: string;
  phone?: string;
  gender?: number | null;
  email?: string;
  dob?: number | string | null;
  bloodGroup?: number | null;
  // other optional fields
}

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

  patientList: any[] = [];
  patientDetails: Patient[] = [];

  isSubmenuOpen = false;

  // string-keyed maps used internally; helper getters below handle undefined/number keys
  private genderMap: Record<string, string> = { '1': 'Male', '2': 'Female', '3': 'Other' };
  private bloodGroupMap: Record<string, string> = {
    '1': 'A+',
    '2': 'A-',
    '3': 'B+',
    '4': 'B-',
    '5': 'O+',
    '6': 'O-',
    '7': 'AB+',
    '8': 'AB-',
  };

  // Inline endpoints & constants (edit to match your backend)
  private readonly API_BASE = 'http://localhost:3000';
  private readonly ENDPOINTS = {
    doctorList: '/doctor/list',
    patientProfile: '/doctor/record',
    // patientProfile: '/doctor/patientProfile',
    patientAppointmentList: '/doctor/appointment/list',
  };

  private readonly PROFILE_STATUS = {
    APPROVE: 'APPROVE',
    PENDING: 'PENDING',
    DEACTIVATE: 'DEACTIVATE',
    DELETE: 'DELETE',
    REJECT: 'REJECT',
  };

  constructor(private renderer: Renderer2, private router: Router, private http: HttpClient, private crypto: CryptoProvider) {}

  ngOnInit(): void {
    const token = this.getToken();
    if (!token) {
      window.localStorage.removeItem('authToken');
      this.router.navigate(['/auth/login']);
      return;
    }

    this.getPatientList().catch((e) => console.error('getPatientList error', e));

    const approvalStatus = window.localStorage.getItem('approvalStatus');
    if (approvalStatus === this.PROFILE_STATUS.APPROVE) {
      this.hideView = false;
      this.getPatientList().catch((e) => console.error('getPatientList error', e));
    } else {
      this.hideView =
        approvalStatus === this.PROFILE_STATUS.PENDING ||
        approvalStatus === this.PROFILE_STATUS.DEACTIVATE ||
        approvalStatus === this.PROFILE_STATUS.DELETE ||
        approvalStatus === this.PROFILE_STATUS.REJECT;
    }

    window.addEventListener('storage', this.onStorageEvent);
  }

  // private getToken(): string | null {
  //   return window.localStorage.getItem('authToken') || window.localStorage.getItem('token') || "null";
  //   // return window.localStorage.getItem('authToken') || window.localStorage.getItem('token') || "null";
  // }

  private getToken(): string | null {
  try {
    // try both keys
    const enc =
      window.localStorage.getItem("authToken") ||
      window.localStorage.getItem("token");

    if (!enc) return null;

    // decrypt using your CryptoProvider
    const decrypted = this.crypto.decryptObj(enc);

    // decrypted might be:
    //  1. a plain string (the JWT itself)
    //  2. a JSON object containing { token: "..." }
    if (typeof decrypted === "string") {
      return decrypted;
    }

    if (decrypted && typeof decrypted === "object" && decrypted.token) {
      return decrypted.token;
    }

    // fallback
    return null;
  } catch (err) {
    console.error("Failed to decrypt token", err);
    return null;
  }
}


  private buildHeaders(): HttpHeaders {
    const token = this.getToken();
    // const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzBmY2QxNjFmYWI2NDEwOTgyNjQxMmEiLCJ1c2VyVHlwZSI6MiwiZGV2aWNlSWQiOiIxMjM0NTYiLCJkZXZpY2VUeXBlIjoiZGVza3RvcCIsImRldmljZVRva2VuIjoiZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SjBiMnRsYmw5MGVYQmxJam9pWVdOalpYTnpJaXdpWlhod0lqb3hOalk1TmpReE5UVTNMQ0pwWVhRaU9qRTJOamsxTlRVeE5UY3NJbXAwYVNJNklqUmlZMkl6TVRWbU0yTTJNelF3WWpZNU16TTRORGRtWWpJd05EazBOVFV5SWl3aWRYTmxjbDlwWkNJNklqSXhNREExWW1ZeExUVXpNREV0TkRreU1TMWlNRE0xTFdZeE1UbGhOVEpqTnpWbU1TSjkubG91VkVMYkFNV3pwVW9OeGhiRjMtYmlsQkZXVVVKZzRsc1RYQUlCaWU2SSIsImJyb3dzZXIiOiJjaHJvbWUiLCJvcyI6IndpbmRvd3MiLCJ0b2tlblR5cGUiOjEsImZ1bGxOYW1lIjoiRHIuIEQgRGhhbmFtamF5YSIsImlhdCI6MTc1NzY3Nzk4NywiZXhwIjoxNzU4MjgyNzg3fQ.WIRyTTj39vT7RMJVe1dkwuHARtfd0r_FDPvAOBWdOCI";
    // const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGMyYTYxNTdjNDMyNDI3ZmY1ZGQxNjkiLCJmdWxsTmFtZSI6IkRyLiBBdmluYXNoLVRlc3QiLCJpYXQiOjE3NTc1ODgyMzgsImV4cCI6MTc1ODE5MzAzOH0.I6pY8SL5BNdiXXqsbO4P5PkGNUFFDa_76waPlkY1QeU";

    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
      console.log("token: ",token);
    }
    return headers;
  }

  // Helper to safely read gender label
  getGender(g: number | string | null | undefined): string {
    const key = g == null ? '' : String(g);
    return this.genderMap[key] || 'N/A';
  }

  // Helper to safely read blood-group label
  getBloodGroup(b: number | string | null | undefined): string {
    const key = b == null ? '' : String(b);
    return this.bloodGroupMap[key] || 'N/A';
  }

  async getPatientList(): Promise<void> {
    const headers = { headers: this.buildHeaders() };
    const url = `${this.API_BASE}${this.ENDPOINTS.doctorList}?page=1&size=100&type=2`;

    try {
      const raw: any = await firstValueFrom(this.http.get(url, headers));
      console.log("raw: ",raw);
      const list = raw?.result?.data || raw?.data?.data || raw?.data || raw?.result || raw || [];
      this.patientList = Array.isArray(list) ? list : [];
      console.log("patientList: ",this.patientList);

      const profilePromises: Promise<any>[] = [];
      for (const element of this.patientList) {
        if (Array.isArray(element.documents)) {
          for (const doc of element.documents) {
            const patientId = doc._id || doc.patientId;
            if (patientId) {
              const profileUrl = `${this.API_BASE}${this.ENDPOINTS.patientProfile}?patientId=${patientId}`;
              profilePromises.push(firstValueFrom(this.http.get(profileUrl, headers)));
            }
          }
        }
      }

      const settled = await Promise.allSettled(profilePromises);
      this.patientDetails = [];

      settled.forEach((entry) => {
        if (entry.status === 'fulfilled') {
          const val: any = (entry as PromiseFulfilledResult<any>).value;
          const profileObj = val?.result || val?.data || val;
          if (profileObj) {
            if (profileObj._id || profileObj.patientName) {
              this.patientDetails.push(profileObj);
            } else if (profileObj.result && (profileObj.result._id || profileObj.result.patientName)) {
              this.patientDetails.push(profileObj.result);
            } else {
              this.patientDetails.push(profileObj);
            }
          }
        } else {
          console.error('Profile fetch failed:', (entry as PromiseRejectedResult).reason);
        }
      });

      // fallback to construct minimal profiles if none returned
      if (this.patientDetails.length === 0 && this.patientList.length > 0) {
        for (const element of this.patientList) {
          if (Array.isArray(element.documents)) {
            for (const d of element.documents) {
              this.patientDetails.push({
                _id: d._id || d.patientId || '',
                patientName: d.patientName || element.patientName || 'Unknown',
                phone: d.phone || element.phone || '',
                gender: d.gender ?? element.gender ?? null,
                email: d.email || '',
                dob: d.dob || null,
                bloodGroup: d.bloodGroup ?? null,
              } as Patient);
            }
          }
        }
      }

      this.filteredPatientDetails = [...this.patientDetails];
    } catch (err) {
      console.error('Error fetching patient list:', err);
      this.patientList = [];
      this.patientDetails = [];
      this.filteredPatientDetails = [];
    }
  }

  getDetails(item: any) {
    if (!item || !item._id) {
      console.warn('getDetails called with invalid item', item);
      return;
    }

    this.currentName = item.patientName || 'Patient';
    const headers = { headers: this.buildHeaders() };
    const url = `${this.API_BASE}${this.ENDPOINTS.patientAppointmentList}?patientId=${item._id}`;

    this.http.get(url, headers).subscribe({
      next: (res: any) => {
        const data = res?.result?.data.data ?? res?.data.data ?? [];
        console.log("appointmentList: ",data);
        if (Array.isArray(data) && data.length > 0) {
          this.appointmentList = data.map((a: any) => ({ ...a, date: a.date ? new Date(a.date) : new Date() }));
        } else {
          this.appointmentList = [];
        }
        console.log("appointmentList: ",this.appointmentList);
        this.openModal('details');
      },
      error: (err) => {
        console.error('Error fetching appointments', err);
        this.appointmentList = [];
        this.openModal('details');
      },
    });
  }

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

  private onStorageEvent = (ev: StorageEvent) => {
    const relevantKeys = ['authToken', 'authUser', 'deviceId', 'token'];
    if (ev.key === null || relevantKeys.includes(ev.key)) {
      const token = this.getToken();
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

// src/app/features/establishment/establishment2.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CryptoProvider } from './crypto.service'; 

// Global Google Maps JS declaration
declare const google: any;

// --- TYPES & INTERFACES ---

type EstablishmentItem = {
  establishmentId?: string;
  _id?: string;
  isOwner?: boolean;
    isDeleted?: boolean;           // <-- Added isDeleted explicitly
  Consultation_type?: string;   
  consultationFees?: number;
  videoConsultationFees?: number;
  hospitalTypeId?: string;
  hospitalData?: {
    hospitalId?: string;
    name?: string;
    address?: {
      landmark?: string;
      locality?: string;
      city?: string;
      state?: string;
      pincode?: string;
      sampleCityName?: string;
    };
    location?: {
      coordinates: number[];
    };
  };
  establishmentProof?: Array<{ url: string; urlType: string; fileName?: string }>;
  mon?: Array<any>;
  tue?: Array<any>;
  wed?: Array<any>;
  thu?: Array<any>;
  fri?: Array<any>;
  sat?: Array<any>;
  sun?: Array<any>;
  [key: string]: any; // for dynamic day properties
};

export type Predication = { description: string; place_id: string };

export type StateOption = { _id: string; name: string };

// Payload structure for submission
export type SubmissionPayload = {
  formValue: any;
  daysData: any;
  establishmentProofUrl: string | null;
  location: { coordinates: number[] };
  consultationFees: number | null;
  videoConsultationFees: number | null;
};

// --- SERVICE IMPLEMENTATION ---

@Injectable({
  providedIn: 'root',
})
export class EstablishmentService2 {
  private readonly DRAFT_PREFIX = 'establishmentDraft::';
  private readonly streetArray = [
    'sublocality_level_3', 'premise', 'plus_code', 'route', 
    'neighborhood', 'street_number', 'subpremise',
  ];
  private readonly landMarkArray = [
    'landmark', 'sublocality', 'sublocality_level_1', 'sublocality_level_2',
  ];

  constructor(
    private http: HttpClient,
    private crypto: CryptoProvider,
    private fb: FormBuilder
  ) {}

  // ----------------------------
  // Token & Auth Management
  // ----------------------------
  public hasValidToken(): boolean {
    return !!localStorage.getItem('authToken');
  }

  public clearToken(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  }

  private safeDecrypt(maybeEncrypted: string | null): string {
    if (!maybeEncrypted) return '';
    try {
      const dec = this.crypto.decryptObj(maybeEncrypted);
      if (typeof dec === 'string') return dec;
      if (dec && typeof dec === 'object' && dec.token) return String(dec.token);
      return String(dec);
    } catch (e) {
      return maybeEncrypted;
    }
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.safeDecrypt(localStorage.getItem('authToken'));
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    });
  }

  // ----------------------------
  // API Calls
  // ----------------------------

  /**
   * Fetches the list of doctor's establishments.
   */
  getEstablishmentList(): Observable<EstablishmentItem[] | null> {
    const headers = this.getAuthHeaders();
    const url = `http://localhost:8080/api/v1/doctor/doctor-establishment-list?size=100`;

    return this.http.get<any>(url, { headers }).pipe(
      catchError((err) => {
        console.error('Error fetching establishment list:', err);
        return of(null);
      }),
      // Map the response structure to a usable array of items
      (res: Observable<any>) => res.pipe(
        (obs) => new Observable<EstablishmentItem[] | null>((observer) => {
            obs.subscribe({
                next: (res) => {
                    const data = (res?.result ?? res)?.data ?? [];
                    observer.next(Array.isArray(data) ? data : []);
                    observer.complete();
                },
                error: (err) => observer.error(err)
            });
        })
      )
    );
  }

  /**
   * Submits the form data to either create (POST) or edit (PUT) an establishment.
   */
  submitEstablishment(
    payload: SubmissionPayload,
    isEditMode: boolean,
    establishmentId: string | null,
    lastPatchedItem: EstablishmentItem | null
  ): Observable<any> {
    const headers = this.getAuthHeaders();
    
    // --- Edit Mode (PUT) ---
    if (isEditMode && establishmentId) {
        const hospitalIdForQuery = lastPatchedItem?.hospitalData?.hospitalId || lastPatchedItem?._id || '';
        const base = 'http://localhost:8080/api/v1/doctor/doctor-edit-establishment';
        const query = `?establishmentId=${encodeURIComponent(establishmentId)}${hospitalIdForQuery ? `&hospitalId=${encodeURIComponent(hospitalIdForQuery)}` : ''}`;
        const updateUrl = `${base}${query}`;
        
        const putPayload = {
            _id: establishmentId,
            isOwner: lastPatchedItem?.isOwner !== undefined ? String(lastPatchedItem.isOwner) : 'true',
            location: payload.location,
            consultationFees: payload.consultationFees,
            videoConsultationFees: payload.videoConsultationFees,
            ...payload.daysData, // mon, tue, etc. arrays
        };

        return this.http.put(updateUrl, putPayload, { headers }).pipe(
            catchError((err) => {
                console.error('Edit API error:', err);
                return of({ error: `Error updating establishment: ${err.message || err.statusText || 'Server error'}` });
            })
        );
    }

    // --- Create Mode (POST) ---
    const createUrl = `http://localhost:3000/doctor/doctor-add-establishment`;
    const formValue = payload.formValue;
    
    const createPayload = {
      showVideo: formValue.showVideo,
      Consultation_type: formValue.Consultation_type,
      name: formValue.name,
      hospitalTypeId: formValue.hospitalTypeId,
      hospitalId: null,
      address: {
          landmark: formValue.address.landmark,
          locality: formValue.address.locality || '',
          city: formValue.address.city,
          state: "649eb68f91de0b6d62d284e7", // Hardcoded state ID from original logic
          sampleCityName: formValue.address.sampleCityName || formValue.address.city || '',
          pincode: formValue.address.pincode,
          country: 'India',
      },
      establishmentMobile: '',
      establishmentEmail: '',
      location: payload.location,
      consultationFees: payload.consultationFees,
      videoConsultationFees: payload.videoConsultationFees,
      establishmentProof: payload.establishmentProofUrl
        ? [{
            url: payload.establishmentProofUrl,
            fileType: "image",
            urlType: formValue.proofType || 'Clinic Registration Certificate'
        }] : [],
      proofType: formValue.proofType,
      ...payload.daysData,
      isOwner: 1,
    };

    return this.http.post(createUrl, createPayload, { headers }).pipe(
      catchError((err) => {
        console.error('Create API error:', err);
        return of({ error: `Error creating establishment: ${err.message || err.statusText || 'Server error'}` });
      })
    );
  }

  // ----------------------------
  // Form Builders (used by component and patch logic)
  // ----------------------------
  
  public createTimeSlotGroup(): FormGroup {
    return this.fb.group({
      from: ['', Validators.required],
      to: ['', Validators.required],
    });
  }
  
  public createDayGroup(): FormGroup {
    return this.fb.group({
      day: ['', Validators.required],
      timeSlots: this.fb.array([this.createTimeSlotGroup()]),
    });
  }

  // ----------------------------
  // Form Patching Logic (Edit Mode)
  // ----------------------------
  
  /**
   * Patches the form with data from a single establishment item fetched from the API.
   * @returns The updated establishment item.
   */
  patchFormForEdit(item: EstablishmentItem, form: FormGroup, location: number[], setProofUrl: (url: string) => void): EstablishmentItem {
    
    // 1) Basic & Fees
    form.get('name')?.patchValue(item.hospitalData?.name ?? '');
    form.get('hospitalTypeId')?.patchValue(item.hospitalTypeId ?? '');

    const hasClinicFees = item.consultationFees !== undefined && item.consultationFees !== null && item.consultationFees !== -1;
    const hasVideoFees = item.videoConsultationFees !== undefined && item.videoConsultationFees !== null;

    form.get('showInClinic')?.patchValue(!!hasClinicFees);
    form.get('showVideo')?.patchValue(!!hasVideoFees);
    form.get('consultationFees')?.patchValue(hasClinicFees ? item.consultationFees : '');
    form.get('videoConsultationFees')?.patchValue(hasVideoFees ? item.videoConsultationFees : '');

    // 2) Address
    if (item.hospitalData?.address) {
      const addr = item.hospitalData.address;
      form.get('address')?.patchValue({
        landmark: addr.landmark ?? '',
        locality: addr.locality ?? '',
        city: addr.city ?? '',
        state: addr.state ?? '',
        pincode: addr.pincode ?? '',
        sampleCityName: addr.city ?? addr.sampleCityName ?? '',
      });
    }

    // 3) Location (update array passed by reference)
    if (item.hospitalData?.location?.coordinates && Array.isArray(item.hospitalData.location.coordinates)) {
        location[0] = item.hospitalData.location.coordinates[0];
        location[1] = item.hospitalData.location.coordinates[1];
    }

    // 4) Proof
    const proofCtrl = form.get('establishmentProof');
    const ptCtrl = form.get('proofType');
    if (Array.isArray(item.establishmentProof) && item.establishmentProof.length > 0) {
        const pr = item.establishmentProof[0];
        if (pr.url) {
            setProofUrl(pr.url);
            if (proofCtrl) {
                proofCtrl.patchValue(pr.fileName ?? pr.url ?? '');
                proofCtrl.clearValidators();
                proofCtrl.updateValueAndValidity();
            }
        }
        if (pr.urlType && ptCtrl) {
            ptCtrl.patchValue(pr.urlType);
            ptCtrl.clearValidators();
            ptCtrl.updateValueAndValidity();
        }
    } else {
        // Restore required validators if no proof exists
        if (proofCtrl && !proofCtrl.validator) {
            proofCtrl.setValidators([Validators.required]);
            proofCtrl.updateValueAndValidity();
        }
        if (ptCtrl && !ptCtrl.validator) {
            ptCtrl.setValidators([Validators.required]);
            ptCtrl.updateValueAndValidity();
        }
    }

    // 5) Days/TimeSlots
    const daysArr = form.get('days') as FormArray;
    while (daysArr.length > 0) daysArr.removeAt(0); // Clear existing

    const weekDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    let anyDayPatched = false;

    for (const wd of weekDays) {
        const slots = item[wd];
        if (Array.isArray(slots) && slots.length > 0) {
            const dayGroup = this.fb.group({
                day: [wd, Validators.required],
                timeSlots: this.fb.array(slots.map((s: any) => this.createTimeSlotGroup().patchValue({from: s.from, to: s.to}))),
            });
            daysArr.push(dayGroup);
            anyDayPatched = true;
        }
    }

    if (!anyDayPatched) {
        // Default to one empty day group if no data exists
        daysArr.push(this.createDayGroup());
    }

    return item;
  }

  // ----------------------------
  // Google Places Logic
  // ----------------------------

  public getPlacePredictions(search: string): Observable<Predication[]> {
    if (typeof google === 'undefined' || !search) return of([]);

    return new Observable<Predication[]>((observer) => {
      const service = new google.maps.places.AutocompleteService();
      const options = { input: search, componentRestrictions: { country: 'IN' } };

      service.getPlacePredictions(options, (predictions: any[], status: any) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          observer.next(predictions.map((p) => ({ description: p.description, place_id: p.place_id })));
        } else {
          observer.next([]);
        }
        observer.complete();
      });
    });
  }

  public getPlaceDetails(placeId: string, stateList: StateOption[]): Observable<{ address: any; location: number[] } | null> {
    if (typeof google === 'undefined') return of(null);

    return new Observable((observer) => {
      const placeService = new google.maps.places.PlacesService(document.createElement('div'));
      
      placeService.getDetails({ placeId }, (placeDetails: any, status: any) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && placeDetails) {
          const address: any = this.extractAddressComponents(placeDetails.address_components, stateList);
          const location: number[] = placeDetails.geometry?.location 
                                      ? [placeDetails.geometry.location.lng(), placeDetails.geometry.location.lat()] 
                                      : [77.216721, 28.6448]; // default location

          observer.next({ address, location });
        } else {
          observer.next(null);
        }
        observer.complete();
      });
    });
  }

  private extractAddressComponents(addressComponents: any[], stateList: StateOption[]): any {
    const address: any = {
      landmark: '', locality: '', city: '', state: null, pincode: '', country: 'India',
    };

    for (const component of addressComponents) {
      if (this.streetArray.some((i) => component.types.includes(i))) {
        address.landmark += component.long_name + ', ';
        continue;
      }
      if (this.landMarkArray.some((i) => component.types.includes(i))) {
        address.locality += component.long_name + ', ';
        continue;
      }

      const componentType = component.types[0];
      switch (componentType) {
        case 'locality': case 'administrative_area_level_3': case 'administrative_area_level_2':
          if (!address.city) address.city = component.long_name;
          break;
        case 'postal_code':
          address.pincode = component.long_name;
          break;
        case 'administrative_area_level_1':
          if (stateList.length) {
            const match = stateList.find((s) => s.name.toLowerCase() === component.long_name.toLowerCase());
            address.state = match ? match._id : component.long_name;
          } else {
            address.state = component.long_name;
          }
          break;
        case 'country':
          address.country = component.long_name;
          break;
      }
    }
    address.landmark = address.landmark.replace(/,\s*$/, '').trim();
    address.locality = address.locality.replace(/,\s*$/, '').trim();
    return address;
  }
  
  // ----------------------------
  // Local Storage (Draft Management)
  // ----------------------------
  
  private getCurrentUserIdentifier(): string {
    // Logic to securely get user ID or fall back to device ID. Moved from component.
    try {
        const rawAuthUser = localStorage.getItem('authUser');
        if (rawAuthUser) {
            try {
                const dec = this.crypto.decryptObj(rawAuthUser);
                if (dec && typeof dec === 'object' && (dec._id || dec.id || dec.userId)) {
                    return String(dec._id || dec.id || dec.userId);
                }
            } catch (e) { /* ignored */ }
        }
    } catch (err) { /* ignored */ }

    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      const uuid = this.generateUUID();
      try { localStorage.setItem('deviceId', uuid); } catch (e) { /* ignored */ }
      deviceId = uuid;
    }
    return deviceId;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  public saveDraft(form: FormGroup, proofUrl: string | null, location: number[]): void {
    const key = `${this.DRAFT_PREFIX}${this.getCurrentUserIdentifier()}`;
    const draftObj = {
      meta: {
        savedAt: new Date().toISOString(),
        userId: this.getCurrentUserIdentifier(),
      },
      form: form.getRawValue(),
      proof: {
        url: proofUrl,
        fileName: form.get('establishmentProof')?.value || null,
      },
      location: location,
    };
    try {
      localStorage.setItem(key, JSON.stringify(draftObj));
    } catch (err) {
      console.warn('Could not save establishment draft to localStorage', err);
    }
  }

  public loadDraft(): any | null {
    const key = `${this.DRAFT_PREFIX}${this.getCurrentUserIdentifier()}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      const currentId = this.getCurrentUserIdentifier();
      if (!parsed.meta || parsed.meta.userId !== currentId) {
        return null;
      }
      return parsed;
    } catch (err) {
      console.warn('Failed to parse establishment draft from localStorage', err);
      return null;
    }
  }

  public clearDraftForCurrentUser(): void {
    const k = `${this.DRAFT_PREFIX}${this.getCurrentUserIdentifier()}`;
    try {
      localStorage.removeItem(k);
    } catch (err) {
      console.warn('Failed to remove draft key', k, err);
    }
  }
}
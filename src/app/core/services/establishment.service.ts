import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormArray, FormGroup } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CryptoProvider } from '../../core/services/crypto.service';
import { environment } from '../../../environments/environment'; 
// Global Google Maps JS declaration (moved here as service uses it)
declare const google: any; 

// --- Interfaces for Data Consistency ---
interface DaySlot {
  day: string;
  timeSlots: { from: string; to: string }[];
}

interface EstablishmentPayload {
  showVideo: boolean;
  Consultation_type: string;
  name: string;
  hospitalTypeId: string;
  hospitalId: null;
  address: {
    landmark: string;
    locality: string;
    city: string;
    state: string;
    sampleCityName: string;
    pincode: string;
    country: string;
  };
  establishmentMobile: string;
  establishmentEmail: string;
  location: {
    coordinates: number[];
  };
  consultationFees: string;
  videoConsultationFees: string;
  establishmentProof: Array<{ url: string; fileType: string; urlType: string }>;
  proofType: string;
  isOwner: number;
  [day: string]: any; // Allows for dynamic day properties like 'mon', 'tue'
}

@Injectable({
  providedIn: 'root',
})
export class EstablishmentService {
  // Constants (Moved from Component)
  private readonly API_BASE = 'http://localhost:3000';
  private readonly LIST_URL = `${environment.baseUrl2}/api/v1/doctor/doctor-establishment-list?size=100`; // Existing check URL
  // private readonly LIST_URL = 'http://localhost:8080/api/v1/doctor/doctor-establishment-list?size=100'; // Existing check URL
  private readonly SUBMIT_URL = `${environment.baseUrl}/doctor/doctor-add-establishment`;
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
    private crypto: CryptoProvider
  ) {}

  // ----------------------------
  // AUTH & HEADERS LOGIC
  // ----------------------------
  public hasValidToken(): boolean {
    const token = localStorage.getItem('authToken');
    return !!token;
  }

  public safeDecrypt(maybeEncrypted: string | null): string {
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

  private buildHeaders(): HttpHeaders {
    const token = this.safeDecrypt(localStorage.getItem('authToken'));
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    });
  }

  // ----------------------------
  // API CALLS
  // ----------------------------

  public checkExistingEstablishments(): Observable<boolean> {
    const headers = this.buildHeaders();

    return this.http.get<any>(this.LIST_URL, { headers }).pipe(
      map((resp) => {
        if (!resp) return false;
        if (Array.isArray(resp)) return resp.length > 0;
        // Check for common nested structures
        if (resp.result && resp.result.count > 0) return true;
        if (Array.isArray(resp.data)) return resp.data.length > 0;
        if (typeof resp.count === 'number') return resp.count > 0;
        if (typeof resp.total === 'number') return resp.total > 0;
        
        // Final fallback: if we got a successful response object, assume true 
        // if no data is present but the response structure is complex.
        return true; 
      }),
      catchError((err) => {
        console.warn('Could not check existing establishments; assuming none. Error:', err);
        return of(false);
      })
    );
  }

  public submitEstablishment(payload: any): Observable<any> {
    const headers = this.buildHeaders();
    return this.http.post(this.SUBMIT_URL, payload, { headers });
  }

  // ----------------------------
  // DRAFT MANAGEMENT (Local Storage)
  // ----------------------------

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private getCurrentUserIdentifier(): string {
    // Logic extracted exactly from the component
    try {
      const rawAuthUser = localStorage.getItem('authUser');
      if (rawAuthUser) {
        try {
          const dec = this.crypto.decryptObj(rawAuthUser);
          if (dec && typeof dec === 'object' && (dec._id || dec.id || dec.userId)) {
            return String(dec._id || dec.id || dec.userId);
          }
        } catch (e) {
          try {
            const parsed = JSON.parse(rawAuthUser);
            if (parsed && (parsed._id || parsed.id || parsed.userId)) {
              return String(parsed._id || parsed.id || parsed.userId);
            }
          } catch (ee) {}
        }
      }
    } catch (err) {}

    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = this.generateUUID();
      try {
        localStorage.setItem('deviceId', deviceId);
      } catch (e) {
        return 'device-fallback-' + this.generateUUID();
      }
    }
    return deviceId;
  }

  private draftKeyForCurrentUser(): string {
    const id = this.getCurrentUserIdentifier();
    return `${this.DRAFT_PREFIX}${id}`;
  }

  public saveDraft(
    formValue: any, 
    proofUrl: string | null, 
    location: number[]
  ): void {
    const key = this.draftKeyForCurrentUser();

    const draftObj: any = {
      meta: {
        savedAt: new Date().toISOString(),
        userId: this.getCurrentUserIdentifier(),
      },
      form: formValue,
      proof: {
        url: proofUrl,
        fileName: formValue.establishmentProof || null,
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
    const key = this.draftKeyForCurrentUser();
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      const currentId = this.getCurrentUserIdentifier();
      
      // Ensure the draft belongs to the current user/device
      if (!parsed.meta || parsed.meta.userId !== currentId) {
        return null;
      }

      return parsed;

    } catch (err) {
      console.warn('Failed to parse establishment draft from localStorage', err);
      return null;
    }
  }

  public clearDraft(): void {
    const k = this.draftKeyForCurrentUser();
    try {
      localStorage.removeItem(k);
    } catch (err) {
      console.warn('Failed to remove draft key', k, err);
    }
  }
  
  // ----------------------------
  // PAYLOAD CONSTRUCTION
  // ----------------------------

  /**
   * Transforms the Reactive Form data into the required API payload structure.
   */
  public buildPayload(formValue: any, daysControls: FormArray, location: number[], establishmentProofUrl: string | null): EstablishmentPayload {
    
    // 1. Process days/timeSlots (supporting 'all' selection)
    const weekDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const daysData: any = {};
    
    // Iterate over the FormArray controls to extract scheduling data
    daysControls.controls.forEach((dayCtrl: any) => {
        const day = dayCtrl.get('day')?.value;
        const slots = (dayCtrl.get('timeSlots') as any).value.map((s: any) => ({
            slot: 'morning', // hardcoded as per original component logic
            from: s.from,
            to: s.to,
        }));

        if (day === 'all') {
            weekDays.forEach((wd) => (daysData[wd] = slots));
        } else if (day) {
            daysData[day] = slots;
        }
    });

    // 2. Construct the main payload object
    return {
      showVideo: formValue.showVideo,
      Consultation_type: formValue.Consultation_type,
      name: formValue.name,
      hospitalTypeId: formValue.hospitalTypeId,
      hospitalId: null, // Hardcoded as null in original code
      address: {
        landmark: formValue.address.landmark,
        locality: formValue.address.locality || '',
        city: formValue.address.city,
        state: "649eb68f91de0b6d62d284e7", // Hardcoded ID in original code
        sampleCityName: formValue.address.sampleCityName || formValue.address.city || '',
        pincode: formValue.address.pincode,
        country: 'India',
      },
      establishmentMobile: '', // Empty string in original code
      establishmentEmail: '', // Empty string in original code
      location: {
        coordinates: [location[0], location[1]],
      },
      consultationFees: formValue.consultationFees,
      videoConsultationFees: formValue.videoConsultationFees,
      // Hardcoded proof array structure (using static URL from original code)
      establishmentProof: establishmentProofUrl
        ? [
            {
              "url": "https://nector-prod.s3.ap-south-1.amazonaws.com/911fda60-9843-11f0-889e-b56686d58677-alleppey-backwater-cruise.jpg",
              "fileType": "image",
              "urlType": "Clinic Registration Certificate"
            }
          ]
        : [],
      proofType: formValue.proofType,
      ...daysData,
      isOwner: 1, // Hardcoded in original code
    } as EstablishmentPayload;
  }
  
  // ----------------------------
  // GOOGLE MAPS & LOCATION HELPERS
  // ----------------------------

  public getAddressComponents(): { streetArray: string[], landMarkArray: string[] } {
    return { streetArray: this.streetArray, landMarkArray: this.landMarkArray };
  }

  public getPlacePredictions(search: string, listName: 'predicationList' | 'predicationCityList', callback: (predictions: Array<{ description: string; place_id: string }>) => void): void {
    if (typeof google === 'undefined') {
        console.error('Google Maps API not loaded');
        return;
    }

    if (!search) {
        callback([]);
        return;
    }

    const service = new google.maps.places.AutocompleteService();
    const options = {
        input: search,
        componentRestrictions: { country: 'IN' },
    };

    service.getPlacePredictions(options, (predictions: any[], status: any) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            callback(predictions.map((prediction) => ({
                description: prediction.description,
                place_id: prediction.place_id,
            })));
        } else {
            callback([]);
        }
    });
  }

  public getPlaceDetails(placeId: string, stateList: Array<{ _id: string; name: string }>, callback: (details: { address: any, location: number[] } | null) => void): void {
    if (typeof google === 'undefined' || !placeId) {
        callback(null);
        return;
    }

    const placeService = new google.maps.places.PlacesService(document.createElement('div'));
    placeService.getDetails({ placeId }, (placeDetails: any, status: any) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && placeDetails) {
            const addressComponents = placeDetails.address_components || [];
            const { streetArray, landMarkArray } = this.getAddressComponents();

            const address: any = {
                landmark: '',
                locality: '',
                city: '',
                state: null,
                pincode: '',
                country: 'India',
                formatted_address: placeDetails.formatted_address || '',
            };

            for (const component of addressComponents) {
                if (streetArray.some((i) => component.types.includes(i))) {
                    address.landmark += component.long_name + ', ';
                    continue;
                }
                if (landMarkArray.some((i) => component.types.includes(i))) {
                    address.locality += component.long_name + ', ';
                    continue;
                }

                const componentType = component.types[0];
                switch (componentType) {
                    case 'locality':
                    case 'administrative_area_level_3':
                    case 'administrative_area_level_2':
                        if (!address.city) address.city = component.long_name;
                        break;
                    case 'postal_code':
                        address.pincode = component.long_name;
                        break;
                    case 'administrative_area_level_1':
                        if (stateList && stateList.length) {
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
            
            let location: number[] = [];
            if (placeDetails.geometry && placeDetails.geometry.location) {
                location = [placeDetails.geometry.location.lng(), placeDetails.geometry.location.lat()];
            }

            callback({ address, location });
        } else {
            callback(null);
        }
    });
  }
}
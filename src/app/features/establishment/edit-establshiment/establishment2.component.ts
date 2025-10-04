// src/app/features/establishment/establishment.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { CryptoProvider } from '../../../core/services/crypto.service';
import { catchError } from 'rxjs/operators';
import { of, Subject, Subscription } from 'rxjs';

import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

// Angular Material modules
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

declare const google: any; // Global Google Maps JS

type DayOption = { value: string; label: string };

// --- FIX HELPER FUNCTION START ---
/**
 * Helper function to generate all times between a start and end time with a given interval.
 * This ensures all possible API return times are available in the <select> options.
 */
function generateTimes(start: string, end: string, intervalMinutes: number = 15): Array<{ name: string }> {
    const times: Array<{ name: string }> = [];
    // Use an arbitrary date string for comparison
    let startTime = new Date(`2000/01/01 ${start}`);
    const endTime = new Date(`2000/01/01 ${end}`);
    
    // Safety check
    if (startTime > endTime) return []; 

    while (startTime <= endTime) {
        // Format to 'h:mm A' (e.g., 9:00 AM, 11:45 AM, 1:00 PM)
        const timeString = startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        times.push({ name: timeString });
        startTime.setMinutes(startTime.getMinutes() + intervalMinutes);
    }

    return times;
}
// --- FIX HELPER FUNCTION END ---

@Component({
  selector: 'app-establishment',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatAutocompleteModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: './establishment2.component.html',
  styleUrls: ['./establishment2.component.scss'],
})
export class EstablishmentComponent2 implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private routeSub?: Subscription;

  // UI state
  currentSlide = 1;
  count = 1;
  isEditMode = false;
  errorMessage = '';
  establishmentProofUrl: string | null = null;
  establishmentProofFile?: File | null = null;

  // hold the id param for edit
  establishmentId: string | null = null;

  // store the original patched item so we can reference ids if needed
  lastPatchedItem: any = null;

  // form
  establishmentForm: FormGroup;

  // hospital types (same as you had)
  hospitalTypeList = [
    { _id: '64dcaf8e26588edd2dfbe462', name: 'Hospital' },
    { _id: '64632b33d9293fff19dcf556', name: 'Super Speciality Hospital' },
    { _id: '64632b33d9293fff19dcf557', name: 'Multi Speciality Hospital' },
    { _id: '64dcaf8e26588edd2dfbe463', name: 'Multi-speciality Clinic' },
    { _id: '64632b33d9293fff19dcf555', name: 'Clinic' },
  ];

  establishmentProofOptions = ['GST Certificate', 'Trade License', 'Clinic Registration Certificate', 'Other'];

  additionalOptions: DayOption[] = [
    { value: 'all', label: 'All Days' },
    { value: 'mon', label: 'Monday' },
    { value: 'tue', label: 'Tuesday' },
    { value: 'wed', label: 'Wednesday' },
    { value: 'thu', label: 'Thursday' },
    { value: 'fri', label: 'Friday' },
    { value: 'sat', label: 'Saturday' },
    { value: 'sun', label: 'Sunday' },
  ];

  // --- FIXED timingArray IMPLEMENTATION ---
  // Generate times from 9:00 AM up to 9:30 PM in 15-minute intervals 
  // to cover all values in the API response like 11:45 AM, 1:00 PM, and 9:00 PM.
  timingArray = generateTimes('9:00 AM', '9:30 PM', 15);
  // --- END FIXED timingArray IMPLEMENTATION ---

  establishmentsList: Array<{ name: string; consultationType: string }> = [];

  // Places-related
  predicationList: Array<{ description: string; place_id: string }> = [];
  predicationCityList: Array<{ description: string; place_id: string }> = [];
  location: number[] = [77.216721, 28.6448]; // [lng, lat]
  stateList: Array<{ _id: string; name: string }> = []; // populate from API if available

  private readonly streetArray = [
    'sublocality_level_3',
    'premise',
    'plus_code',
    'route',
    'neighborhood',
    'street_number',
    'subpremise',
  ];

  private readonly landMarkArray = [
    'landmark',
    'sublocality',
    'sublocality_level_1',
    'sublocality_level_2',
  ];

  private readonly DRAFT_PREFIX = 'establishmentDraft::';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private http: HttpClient,
    private crypto: CryptoProvider
  ) {
    this.establishmentForm = this.fb.group({
      showInClinic: [true],
      showVideo: [false],
      Consultation_type: ['own', Validators.required],
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      hospitalTypeId: ['', Validators.required],
      address: this.fb.group({
        landmark: [''],
        state: [''],
        city: [''],
        locality: [''],
        pincode: ['', [Validators.pattern(/^\d{6}$/)]],
        sampleCityName: [''],
      }),
      proofType: ['', Validators.required],
      establishmentProof: ['', Validators.required],
      consultationFees: [''],
      videoConsultationFees: [''],
      days: this.fb.array([this.createDayGroup()]),
    });
  }

  ngOnInit(): void {
    if (!this.hasValidToken()) {
      this.clearToken();
      this.router.navigate(['/auth/login']);
      return;
    }

    // Load draft if present for this user
    this.loadDraftIfExists();

    window.addEventListener('storage', this.onStorageEvent);

    // Watch route query params for id and mode
    this.routeSub = this.route.queryParams.subscribe((params) => {
      const idFromQuery = params['id'] ?? null;
      this.establishmentId = idFromQuery;
      // Detect edit mode by URL path or explicit 'mode' param or presence of id
      const isEditPath = this.router.url.includes('/establishment/edit');
      if ((idFromQuery && isEditPath) || isEditPath) {
        this.isEditMode = true;
        // Fetch full establishment list and patch the matching item
        if (idFromQuery) {
          this.getEstablishmentList(); // will call patchEditFormValues when found
        } else {
          // fallback: still attempt to fetch list and see if server returns a single item
          this.getEstablishmentList();
        }
      } else {
        this.isEditMode = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('storage', this.onStorageEvent);
    if (this.routeSub) this.routeSub.unsubscribe();
  }

  // ----------------------------
  // getEstablishmentList + patchEditFormValues
  // ----------------------------
  getEstablishmentList(): void {
    const token = this.safeDecrypt(localStorage.getItem('authToken'));
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    });

    const url = `http://localhost:8080/api/v1/doctor/doctor-establishment-list?size=100`;

    this.http.get<any>(url, { headers }).pipe(
      catchError((err) => {
        console.error('Error fetching establishment list:', err);
        return of(null);
      })
    ).subscribe((res: any) => {
      if (!res) {
        // error already logged
        return;
      }
      console.log("edit result: ",res);

      const result = res.result ?? res;
      const data = result?.data ?? [];

      this.establishmentsList = [];
      const ownEstablishment: any[] = [];
      const visitEstablishment: any[] = [];

      if (Array.isArray(data) && data.length > 0) {
        data.forEach((element: any) => {
          if (!element.isDeleted) {
            if (element.isOwner) {
              ownEstablishment.push(element);
            } else {
              visitEstablishment.push(element);
            }
          }
        });
      }

      if (this.isEditMode && this.establishmentId) {
        const item = data.find((est: any) => String(est.establishmentId) === String(this.establishmentId));
        if (item) {
          this.patchEditFormValues(item);
          this.lastPatchedItem = item;
        } else {
          console.warn('Edit id not found in establishment list:', this.establishmentId);
        }
      }
    });
  }

  private patchEditFormValues(item: any): void {
    if (!item) return;

    this.isEditMode = true;
    this.lastPatchedItem = item;

    // 1) Basic
    if (item.hospitalData?.name) {
      this.establishmentForm.get('name')?.patchValue(item.hospitalData.name);
    }
    if (item.hospitalTypeId) {
      this.establishmentForm.get('hospitalTypeId')?.patchValue(item.hospitalTypeId);
    }

    // 2) clinic/video flags and fees
    const hasClinicFees = item.consultationFees !== undefined && item.consultationFees !== null && item.consultationFees !== -1;
    const hasVideoFees = item.videoConsultationFees !== undefined && item.videoConsultationFees !== null;

    this.establishmentForm.get('showInClinic')?.patchValue(!!hasClinicFees);
    this.establishmentForm.get('showVideo')?.patchValue(!!hasVideoFees);

    this.establishmentForm.get('consultationFees')?.patchValue(hasClinicFees ? item.consultationFees : '');
    this.establishmentForm.get('videoConsultationFees')?.patchValue(hasVideoFees ? item.videoConsultationFees : '');

    // 3) Address
    if (item.hospitalData?.address) {
      const addr = item.hospitalData.address;
      const addrGroup = this.establishmentForm.get('address');
      if (addrGroup) {
        addrGroup.patchValue({
          landmark: addr.landmark ?? '',
          locality: addr.locality ?? '',
          city: addr.city ?? '',
          state: addr.state ?? '',
          pincode: addr.pincode ?? '',
          sampleCityName: addr.city ?? addr.sampleCityName ?? '',
        });
      }
    }

    // 4) Location
    if (item.hospitalData?.location?.coordinates && Array.isArray(item.hospitalData.location.coordinates)) {
      this.location = item.hospitalData.location.coordinates.slice(0, 2);
    }

    // 5) proof
    if (Array.isArray(item.establishmentProof) && item.establishmentProof.length > 0) {
      const pr = item.establishmentProof[0];
      if (pr.url) {
        this.establishmentProofUrl = pr.url;
        const proofControl = this.establishmentForm.get('establishmentProof');
        if (proofControl) {
          proofControl.patchValue(pr.fileName ?? pr.url ?? '');
          proofControl.clearValidators();
          proofControl.updateValueAndValidity();
        }
      }
      if (pr.urlType) {
        const ptCtrl = this.establishmentForm.get('proofType');
        if (ptCtrl) {
          ptCtrl.patchValue(pr.urlType);
          ptCtrl.clearValidators();
          ptCtrl.updateValueAndValidity();
        }
      }
    } else {
      const proofCtrl = this.establishmentForm.get('establishmentProof');
      const ptCtrl = this.establishmentForm.get('proofType');
      if (proofCtrl && !proofCtrl.validator) {
        proofCtrl.setValidators([Validators.required]);
        proofCtrl.updateValueAndValidity();
      }
      if (ptCtrl && !ptCtrl.validator) {
        ptCtrl.setValidators([Validators.required]);
        ptCtrl.updateValueAndValidity();
      }
    }

    // 6) days/timeSlots
    const daysArr = this.establishmentForm.get('days') as FormArray;
    // Clear existing form array controls
    while (daysArr.length > 0) daysArr.removeAt(0);

    const weekDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    let anyDayPatched = false;

    // Iterate through API response properties (mon, tue, wed, etc.)
    for (const wd of weekDays) {
      const slots = item[wd];
      if (Array.isArray(slots) && slots.length > 0) {
        const dayGroup = this.fb.group({
          day: [wd, Validators.required],
          timeSlots: this.fb.array([]),
        });
        const slotsArr = dayGroup.get('timeSlots') as FormArray;
        
        // Patch time slots
        slots.forEach((s: any) => {
          slotsArr.push(this.fb.group({
            // Ensure `from` and `to` are correctly patched
            from: [s.from || '', Validators.required], 
            to: [s.to || '', Validators.required],
          }));
        });
        
        daysArr.push(dayGroup);
        anyDayPatched = true;
      }
    }

    if (!anyDayPatched) {
      // Fallback logic if the data came in a different structure (your existing logic)
      if (Array.isArray(item.days) && item.days.length) {
        item.days.forEach((d: any) => {
          const dayKey = d.day || d.name || 'mon';
          const group = this.fb.group({
            day: [dayKey, Validators.required],
            timeSlots: this.fb.array([]),
          });
          const arr = group.get('timeSlots') as FormArray;
          const tSlots = d.timeSlots || d.slots || d.slotsArray || [];
          if (Array.isArray(tSlots) && tSlots.length) {
            tSlots.forEach((ts: any) => {
              arr.push(this.fb.group({
                from: [ts.from || '', Validators.required],
                to: [ts.to || '', Validators.required],
              }));
            });
          } else {
            arr.push(this.createTimeSlotGroup());
          }
          daysArr.push(group);
        });
      } else {
        // Default to one empty day group if no data exists
        daysArr.push(this.createDayGroup());
      }
    }

    // keep step1 visible
    this.currentSlide = 1;
    this.count = 1;

    console.log('Patched form with establishment item:', item);
  }

  private extractFileNameFromUrl(url: string): string | null {
    try {
      const parts = url.split('/');
      return parts.length ? parts[parts.length - 1] : null;
    } catch {
      return null;
    }
  }

  // ----------------------------
  // Existing helpers / form builders (unchanged)
  // ----------------------------
  private onStorageEvent = (ev: StorageEvent) => {
    const relevantKeys = ['authToken', 'authUser', 'deviceId'];
    if (ev.key === null || relevantKeys.includes(ev.key)) {
      if (!this.hasValidToken()) {
        this.clearToken();
        if (!this.router.url.startsWith('/auth/login')) {
          this.router.navigate(['/auth/login']);
        }
      }
    }
  };

  private hasValidToken(): boolean {
    const token = localStorage.getItem('authToken');
    return !!token;
  }
  private clearToken(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  }

  // ----------------------------
  // Form helpers: days & timeSlots
  // ----------------------------
  get daysControls(): FormArray {
    return this.establishmentForm.get('days') as FormArray;
  }
  private createTimeSlotGroup(): FormGroup {
    return this.fb.group({
      from: ['', Validators.required],
      to: ['', Validators.required],
    });
  }
  createDayGroup(): FormGroup {
    return this.fb.group({
      day: ['', Validators.required],
      timeSlots: this.fb.array([this.createTimeSlotGroup()]),
    });
  }
  addDay(): void {
    this.daysControls.push(this.createDayGroup());
  }
  removeDay(index: number): void {
    if (this.daysControls.length > 1) {
      this.daysControls.removeAt(index);
    }
  }
  getDayControl(i: number): FormGroup {
    return this.daysControls.at(i) as FormGroup;
  }
  getTimeSlots(dayIndex: number): FormArray {
    return this.daysControls.at(dayIndex).get('timeSlots') as FormArray;
  }
  addTimeSlot(dayIndex: number): void {
    this.getTimeSlots(dayIndex).push(this.createTimeSlotGroup());
  }
  removeTimeSlot(dayIndex: number, slotIndex: number): void {
    const arr = this.getTimeSlots(dayIndex);
    if (arr.length > 1) {
      arr.removeAt(slotIndex);
    }
  }

  isOptionDisabled(optionValue: string, rowIndex: number): boolean {
    const used = this.daysControls.controls.some((ctrl, idx) => {
      if (idx === rowIndex) return false;
      const val = ctrl.get('day')?.value ?? '';
      return val === optionValue;
    });
    return used;
  }

  // ----------------------------
  // UI actions, submission & file handlers (modified onSubmit to use new PUT API)
  // ----------------------------
  previousSlide(): void {
    if (this.currentSlide === 2) {
      this.currentSlide = 1;
      this.count = 1;
    } else {
      this.router.navigate(['/']);
    }
  }

  nextSlide(): void {
    const nameCtrl = this.establishmentForm.get('name');
    const typeCtrl = this.establishmentForm.get('hospitalTypeId');
    const proofTypeCtrl = this.establishmentForm.get('proofType');
    const proofCtrl = this.establishmentForm.get('establishmentProof');

    const validStep1 =
      !!nameCtrl && nameCtrl.valid &&
      !!typeCtrl && typeCtrl.valid &&
      !!proofTypeCtrl && proofTypeCtrl.valid &&
      !!proofCtrl && proofCtrl.valid;

    if (!validStep1) {
      this.errorMessage = 'Please fill required fields on Step 1';
      this.markAllAsTouched(this.establishmentForm);
      return;
    }

    this.errorMessage = '';

    try {
      this.saveDraft();
    } catch (err) {
      console.warn('Failed to save draft to localStorage', err);
    }

    this.currentSlide = 2;
    this.count = 2;
  }

  markAllAsTouched(group: FormGroup | FormArray) {
    Object.keys((group as any).controls || {}).forEach((key) => {
      const ctrl = (group as any).controls[key];
      if (ctrl instanceof FormControl) {
        ctrl.markAsTouched();
      } else {
        this.markAllAsTouched(ctrl);
      }
    });
  }

  isSubmitting = false;

  onSubmit(): void {
    try {
      this.saveDraft();
    } catch (err) {
      console.warn('Failed to save draft to localStorage on submit', err);
    }

    const formValue = this.establishmentForm.value;

    // Build days mapping to mon,tue,... arrays for API
    const weekDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const daysData: any = {};
    this.daysControls.controls.forEach((dayCtrl: any) => {
      const day = dayCtrl.get('day')?.value;
      const slots = (dayCtrl.get('timeSlots') as any).value.map((s: any) => ({
        slot: 'morning', // NOTE: You hardcoded 'morning' slot type here. Adjust if API needs more specific slot times.
        from: s.from,
        to: s.to,
      }));

      if (day === 'all') {
        weekDays.forEach((wd) => (daysData[wd] = slots));
      } else {
        daysData[day] = slots;
      }
    });

    // Build PUT payload expected by your API
    const payload: any = {
      // _id field: prefer patched hospitalId (hospital record), else fallback to lastPatchedItem._id or query param
      _id: this.establishmentId || null,
      isOwner: this.lastPatchedItem?.isOwner !== undefined ? String(this.lastPatchedItem.isOwner) : 'true',
      location: {
        coordinates: [this.location[0], this.location[1]],
      },
      consultationFees: formValue.consultationFees || null,
      videoConsultationFees: formValue.videoConsultationFees || null,
      // merge in days arrays (mon,tue,...)
      ...daysData,
    };

    // If form is invalid, stop submission
    if (this.establishmentForm.invalid) {
        this.markAllAsTouched(this.establishmentForm);
        this.errorMessage = 'Please fill all required fields in consultation timing and fees.';
        console.error('Form is invalid, stopping submission.');
        return;
    }

    console.log('PUT payload (edit):', payload);

    this.isSubmitting = true;
    const token = this.safeDecrypt(localStorage.getItem('authToken'));

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    });

    // If in edit mode, call the edit endpoint you specified using query params
    if (this.isEditMode && this.establishmentId) {
      const establishmentIdForQuery = this.establishmentId; // primary query param
      console.log("establishmentIdForQuery: ",establishmentIdForQuery);
      const hospitalIdForQuery = (this.lastPatchedItem?.hospitalData?.hospitalId) ? this.lastPatchedItem.hospitalData.hospitalId : (this.lastPatchedItem?._id || '');
      console.log("hospitalIdForQuery: ",hospitalIdForQuery);


      // Build query string
      const base = 'http://localhost:8080/api/v1/doctor/doctor-edit-establishment';
      const query = `?establishmentId=${encodeURIComponent(establishmentIdForQuery)}${hospitalIdForQuery ? `&hospitalId=${encodeURIComponent(hospitalIdForQuery)}` : ''}`;
      const updateUrl = `${base}${query}`;

      this.http
        .put(updateUrl, payload, { headers })
        .pipe(finalize(() => (this.isSubmitting = false)))
        .subscribe({
          next: (resp: any) => {
            console.log('Edit API success response:', resp);
            try {
              this.clearDraftForCurrentUser();
            } catch (err) {
              console.warn('Failed to clear draft', err);
            }
            this.router.navigate(['/doc-establishment']);
          },
          error: (err) => {
            console.error('Edit API error:', err);
            this.errorMessage = `Error updating establishment: ${err.message || err.statusText || 'Server error'}`;
          },
        });
      return;
    }

    // Otherwise create new establishment (existing behaviour)
    const createUrl = `http://localhost:3000/doctor/doctor-add-establishment`;
    // Original payload for creation (use your previous payload shape)
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
        state: "649eb68f91de0b6d62d284e7",
        sampleCityName: formValue.address.sampleCityName || formValue.address.city || '',
        pincode: formValue.address.pincode,
        country: 'India',
      },
      establishmentMobile: '',
      establishmentEmail: '',
      location: {
        coordinates: [this.location[0], this.location[1]],
      },
      consultationFees: formValue.consultationFees,
      videoConsultationFees: formValue.videoConsultationFees,
      establishmentProof: this.establishmentProofUrl
        ? [
            {
              url: this.establishmentProofUrl,
              fileType: "image",
              urlType: formValue.proofType || 'Clinic Registration Certificate'
            }
          ]
        : [],
      proofType: formValue.proofType,
      ...daysData,
      isOwner: 1,
    };

    this.http
      .post(createUrl, createPayload, { headers })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (resp: any) => {
          console.log('Create API success response:', resp);

          this.establishmentsList.push({
            name: createPayload.name || 'Unnamed',
            consultationType: createPayload.Consultation_type || 'own',
          });
          console.log('Establishment saved locally:', createPayload);

          try {
            this.clearDraftForCurrentUser();
          } catch (err) {
            console.warn('Failed to clear draft', err);
          }

          this.router.navigate(['/doc-establishment']);
        },
        error: (err) => {
          console.error('Create API error:', err);
          this.errorMessage = `Error creating establishment: ${err.message || err.statusText || 'Server error'}`;
        },
      });
  }

  // ----------------------------
  // File handling (upload & preview)
  // ----------------------------
  onFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    this.establishmentProofFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.establishmentProofUrl = String(e.target?.result || null);
      this.establishmentForm.patchValue({ establishmentProof: file.name });
      // remove required validator when user has chosen a file
      const proofCtrl = this.establishmentForm.get('establishmentProof');
      if (proofCtrl) {
        proofCtrl.clearValidators();
        proofCtrl.updateValueAndValidity();
      }
    };
    reader.readAsDataURL(file);
  }
  removeFile(): void {
    this.establishmentProofFile = null;
    this.establishmentProofUrl = null;
    this.establishmentForm.patchValue({ establishmentProof: '' });
    // restore required if in create mode
    if (!this.isEditMode) {
      const proofCtrl = this.establishmentForm.get('establishmentProof');
      if (proofCtrl) {
        proofCtrl.setValidators([Validators.required]);
        proofCtrl.updateValueAndValidity();
      }
    }
  }

  shouldShowInClinicField(): boolean {
    return this.establishmentForm.get('showInClinic')?.value ?? true;
  }
  shouldShowVideoField(): boolean {
    return this.establishmentForm.get('showVideo')?.value ?? false;
  }
  onConsultationChange(value: 'In-clinic' | 'video'): void {
    if (value === 'In-clinic') {
      this.establishmentForm.patchValue({ showInClinic: true, showVideo: false });
    } else {
      this.establishmentForm.patchValue({ showInClinic: false, showVideo: true });
    }
  }

  onInClinicCheckboxChange(): void {
    const current = this.establishmentForm.get('showInClinic')?.value;
    this.establishmentForm.get('showInClinic')?.setValue(!current);
  }
  onVideoCheckboxChange(): void {
    const current = this.establishmentForm.get('showVideo')?.value;
    this.establishmentForm.get('showVideo')?.setValue(!current);
  }


  closeModal(_id?: string) {
    // placeholder for modal close
  }

  // ---------- Places autocomplete helpers ----------
  onSearch(event: any, listName: 'predicationList' | 'predicationCityList') {
    if (typeof google === 'undefined') {
      console.error('Google Maps API not loaded');
      return;
    }

    const search = (event.target?.value || '').trim();
    if (!search) {
      (this as any)[listName] = [];
      return;
    }

    const service = new google.maps.places.AutocompleteService();
    const options = {
      input: search,
      componentRestrictions: { country: 'IN' },
    };

    service.getPlacePredictions(options, (predictions: any[], status: any) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
        (this as any)[listName] = predictions.map((prediction) => ({
          description: prediction.description,
          place_id: prediction.place_id,
        }));
      } else {
        (this as any)[listName] = [];
      }
    });
  }

  displayPlace(place: any): string {
    return place ? place.description || '' : '';
  }

  onPincodeInput(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '');
    const addr = this.establishmentForm.get('address');
    if (addr) {
      addr.get('pincode')?.setValue(input.value);
    }
  }

  onSelectPlace(placeObj: { description?: string; place_id?: string } | any, source: 'landmark' | 'city' = 'landmark') {
    if (!placeObj || typeof google === 'undefined') return;

    const placeId = placeObj.place_id ?? placeObj.placeId ?? null;
    if (!placeId) return;

    const placeService = new google.maps.places.PlacesService(document.createElement('div'));
    placeService.getDetails({ placeId }, (placeDetails: any, status: any) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && placeDetails) {
        const addressComponents = placeDetails.address_components || [];

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
            case 'locality':
            case 'administrative_area_level_3':
            case 'administrative_area_level_2':
              if (!address.city) address.city = component.long_name;
              break;
            case 'postal_code':
              address.pincode = component.long_name;
              break;
            case 'administrative_area_level_1':
              if (this.stateList && this.stateList.length) {
                const match = this.stateList.find((s) => s.name.toLowerCase() === component.long_name.toLowerCase());
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

        this.applyAddressToForm(address, placeDetails, source);

        if (placeDetails.geometry && placeDetails.geometry.location) {
          const lat = placeDetails.geometry.location.lat();
          const lng = placeDetails.geometry.location.lng();
          this.location = [lng, lat];
          const locControl = this.establishmentForm.get('location');
          if (locControl) locControl.patchValue({ coordinates: [lng, lat] });
        }

        this.predicationList = [];
        this.predicationCityList = [];
      }
    });
  }

  private applyAddressToForm(address: any, placeDetails: any, source: 'landmark' | 'city') {
    const addrGroup = this.establishmentForm.get('address');
    if (!addrGroup) return;

    if (source === 'city') {
      addrGroup.patchValue({
        city: address.city || address.formatted_address || '',
        sampleCityName: address.city || address.formatted_address || '',
        state: address.state ?? addrGroup.get('state')?.value ?? '',
      });
    } else {
      addrGroup.patchValue({
        landmark: address.landmark || address.formatted_address || '',
        locality: address.locality || '',
        city: address.city || '',
        state: address.state ?? addrGroup.get('state')?.value ?? '',
        pincode: address.pincode || '',
        sampleCityName: address.city || '',
      });
    }
  }

  // ----------------------------
  // Local storage: draft management
  // ----------------------------
  private getCurrentUserIdentifier(): string {
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

  private saveDraft(): void {
    const key = this.draftKeyForCurrentUser();

    const draftObj: any = {
      meta: {
        savedAt: new Date().toISOString(),
        userId: this.getCurrentUserIdentifier(),
      },
      form: this.establishmentForm.getRawValue(),
      proof: {
        url: this.establishmentProofUrl,
        fileName: this.establishmentForm.get('establishmentProof')?.value || null,
      },
      location: this.location,
    };

    try {
      localStorage.setItem(key, JSON.stringify(draftObj));
    } catch (err) {
      console.warn('Could not save establishment draft to localStorage', err);
    }
  }

  private loadDraftIfExists(): void {
    const key = this.draftKeyForCurrentUser();
    const raw = localStorage.getItem(key);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);

      const currentId = this.getCurrentUserIdentifier();
      if (!parsed.meta || parsed.meta.userId !== currentId) {
        return;
      }

      const savedForm = parsed.form || {};
      const savedProof = parsed.proof || {};
      const savedLocation = parsed.location || null;

      const simpleKeys = [
        'showInClinic',
        'showVideo',
        'Consultation_type',
        'name',
        'hospitalTypeId',
        'proofType',
        'establishmentProof',
        'consultationFees',
        'videoConsultationFees',
      ];

      simpleKeys.forEach((k) => {
        if (savedForm.hasOwnProperty(k)) {
          const ctrl = this.establishmentForm.get(k);
          if (ctrl) ctrl.patchValue(savedForm[k]);
        }
      });

      if (savedForm.address) {
        const addrGroup = this.establishmentForm.get('address');
        if (addrGroup) {
          addrGroup.patchValue({
            landmark: savedForm.address.landmark || '',
            state: savedForm.address.state || '',
            city: savedForm.address.city || '',
            locality: savedForm.address.locality || '',
            pincode: savedForm.address.pincode || '',
            sampleCityName: savedForm.address.sampleCityName || '',
          });
        }
      }

      if (Array.isArray(savedForm.days) && savedForm.days.length) {
        while (this.daysControls.length > 0) {
          this.daysControls.removeAt(0);
        }
        savedForm.days.forEach((d: any) => {
          const dayGroup = this.fb.group({
            day: [d.day || '', Validators.required],
            timeSlots: this.fb.array([]),
          });

          const slotsArr = dayGroup.get('timeSlots') as FormArray;
          if (Array.isArray(d.timeSlots) && d.timeSlots.length) {
            d.timeSlots.forEach((s: any) => {
              const slotGroup = this.fb.group({
                from: [s.from || '', Validators.required],
                to: [s.to || '', Validators.required],
              });
              slotsArr.push(slotGroup);
            });
          } else {
            slotsArr.push(this.createTimeSlotGroup());
          }

          this.daysControls.push(dayGroup);
        });
      }

      if (savedLocation && Array.isArray(savedLocation) && savedLocation.length === 2) {
        this.location = savedLocation;
      }

      if (savedProof && savedProof.url) {
        this.establishmentProofUrl = savedProof.url;
        if (savedProof.fileName) {
          this.establishmentForm.patchValue({ establishmentProof: savedProof.fileName });
        }
      }
    } catch (err) {
      console.warn('Failed to parse establishment draft from localStorage', err);
    }
  }

  private clearDraftForCurrentUser(): void {
    const k = this.draftKeyForCurrentUser();
    try {
      localStorage.removeItem(k);
    } catch (err) {
      console.warn('Failed to remove draft key', k, err);
    }
  }

  // ----------------------------
  // Utilities
  // ----------------------------
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
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
}
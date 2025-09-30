// src/app/features/establishment/establishment.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { CryptoProvider } from '../../../core/services/crypto.service'; 
import { catchError, map } from 'rxjs/operators';
import { of, Subject } from 'rxjs';

import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

// Angular Material modules used in the template
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

declare const google: any; // Global Google Maps JS

type DayOption = { value: string; label: string };

@Component({
  selector: 'app-addestablishment',
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
  templateUrl: './addestablishment.component.html',
  styleUrls: ['./addestablishment.component.scss'],
})
export class AddEstablishmentComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // UI state
  currentSlide = 1;
  count = 1;
  isEditMode = false;
  errorMessage = '';
  establishmentProofUrl: string | null = null;
  establishmentProofFile?: File | null = null;

  // form
  establishmentForm: FormGroup;

  // hospital types (updated as requested)
  hospitalTypeList = [
    { _id: '64dcaf8e26588edd2dfbe462', name: 'Hospital' },
    { _id: '64632b33d9293fff19dcf556', name: 'Super Speciality Hospital' },
    { _id: '64632b33d9293fff19dcf557', name: 'Multi Speciality Hospital' },
    { _id: '64dcaf8e26588edd2dfbe463', name: 'Multi-speciality Clinic' },
    { _id: '64632b33d9293fff19dcf555', name: 'Clinic' },
  ];

  establishmentProofOptions = ['GST Certificate', 'Trade License','Clinic Registration Certificate', 'Other'];

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

  timingArray = [
    { name: '09:00 AM' },
    { name: '09:30 AM' },
    { name: '10:00 AM' },
    { name: '10:30 AM' },
    { name: '11:00 AM' },
    { name: '11:30 AM' },
    { name: '12:00 PM' },
    { name: '12:30 PM' },
    { name: '01:00 PM' },
    { name: '01:30 PM' },
    { name: '02:00 PM' },
    { name: '02:30 PM' },
    { name: '03:00 PM' },
    { name: '03:30 PM' },
    { name: '04:00 PM' },
    { name: '04:30 PM' },
    { name: '05:00 PM' },
  ];

  establishmentsList: Array<{ name: string; consultationType: string }> = [];

  // Places-related
  predicationList: Array<{ description: string; place_id: string }> = [];
  predicationCityList: Array<{ description: string; place_id: string }> = [];
  location: number[] = [77.216721, 28.6448]; // [lng, lat]
  stateList: Array<{ _id: string; name: string }> = []; // populate from API if available

  // helper arrays used when parsing address components
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

  // keys / ids
  private readonly DRAFT_PREFIX = 'establishmentDraft::'; // will append userId or deviceId

  // New properties to match reference logic
  ownEstablishment: any[] = [];
  visitEstablishment: any[] = [];
  ownEstablishmentExist = false; // true if any owned and not deleted
  secoundOwnEstablishemnt = false; // true if any owned and deleted (as per reference variable name)
  apiCalled = false;
  profileData: any = null; // placeholder for profile info if you fetch it elsewhere
  establishmentId: string | null = null; // used if editing an existing establishment

  constructor(
    private router: Router,
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

    // Fetch establishment list and set flags that you requested
    this.getEstablishmentList();

    // load draft after we know user's context
    this.loadDraftIfExists();

    window.addEventListener('storage', this.onStorageEvent);
  }

  // ----------------------------
  // New: fetch establishment list and derive flags (ownEstablishmentExist & secoundOwnEstablishemnt)
  // ----------------------------
  getEstablishmentList() {
    // build headers with token
    const token = this.safeDecrypt(localStorage.getItem('authToken'));
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    });

    const url = `http://localhost:8080/api/v1/doctor/doctor-establishment-list?size=100`;
    this.http.get<any>(url, { headers }).pipe(
      // don't transform result here; handle shapes defensively
    ).subscribe({
      next: (res: any) => {
        this.apiCalled = true;

        // Normalize: many APIs wrap in res.result or return direct array
        const result = res?.result ?? res;

        let count = 0;
        let data: any[] = [];

        if (result) {
          if (typeof result.count === 'number') count = result.count;
          if (Array.isArray(result.data)) data = result.data;
          // some backends return result as array
          if (Array.isArray(result)) data = result;
          // some return { count, data: [...] } under res.result
          if (res && Array.isArray(res.result)) data = res.result;
        }

        // fallback: if data is empty but res is array
        if (!data.length && Array.isArray(res)) data = res;

        if (count || data.length) {
          // empty the arrays
          this.ownEstablishment = [];
          this.visitEstablishment = [];

          data.forEach((element: any) => {
            // skip deleted entries while building lists, but keep them for deleted checks
            if (element.isOwner) {
              this.ownEstablishment.push(element);
            } else {
              this.visitEstablishment.push(element);
            }
          });

          // Check if any active (not deleted) owned establishments exist
          this.ownEstablishmentExist = this.ownEstablishment.some(
            (item) => item.isOwner === true && item.isDeleted === false
          );

          // Check if there are any deleted owned establishments
          this.secoundOwnEstablishemnt = this.ownEstablishment.some(
            (item) => item.isOwner === true && item.isDeleted === true
          );

          // If in edit mode, patch the form with matched item
          if (this.isEditMode && this.establishmentId) {
            const item = data.find((est: any) => est._id == this.establishmentId);
            if (item) this.patchEditFormValues(item);
          }

          // If you want to redirect when an owned establishment already exists (per your earlier comment):
          // if (this.ownEstablishmentExist && !this.isEditMode) {
          //   // navigate to listing / doc-establishment
          //   this.router.navigate(['/doc-establishment']);
          //   return;
          // }
        } else {
          // No establishments
          this.ownEstablishment = [];
          this.visitEstablishment = [];

          // Example behavior from reference: if profile has consultationType -> open add modal, else require verification
          if (this.profileData?.doctor?.consultationType) {
            // openModal('add_address_modal'); // implement as needed
          } else {
            // this.toastr.error('Please Complete Medical Verification Step.'); // implement as needed
            // this.router.navigate(['/doctor/medical-verification']);
          }
        }
      },
      error: (err) => {
        this.apiCalled = true;
        console.error('Error fetching establishment list:', err);
        // fail open: assume no establishments so user can add
        this.ownEstablishment = [];
        this.visitEstablishment = [];
        this.ownEstablishmentExist = false;
        this.secoundOwnEstablishemnt = false;
      }
    });
  }

  // Patch form helper (basic implementation) - extend fields as necessary
  private patchEditFormValues(item: any) {
    if (!item) return;

    try {
      this.isEditMode = true;
      this.establishmentId = item._id || this.establishmentId;

      // basic fields
      this.establishmentForm.patchValue({
        name: item.name || '',
        hospitalTypeId: item.hospitalTypeId || '',
        proofType: item.proofType || '',
        consultationFees: item.consultationFees || '',
        videoConsultationFees: item.videoConsultationFees || '',
        Consultation_type: item.Consultation_type || this.establishmentForm.get('Consultation_type')?.value,
        showInClinic: item.showInClinic !== undefined ? item.showInClinic : this.establishmentForm.get('showInClinic')?.value,
        showVideo: item.showVideo !== undefined ? item.showVideo : this.establishmentForm.get('showVideo')?.value,
      });

      // address
      if (item.address) {
        const addr = item.address;
        const addrGroup = this.establishmentForm.get('address');
        if (addrGroup) {
          addrGroup.patchValue({
            landmark: addr.landmark || '',
            locality: addr.locality || '',
            city: addr.city || '',
            state: addr.state || '',
            pincode: addr.pincode || '',
            sampleCityName: addr.sampleCityName || addr.city || '',
          });
        }
      }

      // days & timeSlots - convert from server shape if present
      if (item.days && typeof item === 'object') {
        // attempt to build days array if server provided an object with day keys
        const dayKeys = ['mon','tue','wed','thu','fri','sat','sun'];
        const savedDays: any[] = [];
        if (dayKeys.some((k) => item[k])) {
          dayKeys.forEach((k) => {
            if (Array.isArray(item[k]) && item[k].length) {
              savedDays.push({ day: k, timeSlots: item[k].map((s: any) => ({ from: s.from, to: s.to })) });
            }
          });
        }

        // If savedDays built, apply to form
        if (savedDays.length) {
          // clear
          while (this.daysControls.length > 0) this.daysControls.removeAt(0);

          savedDays.forEach((d) => {
            const dayGroup = this.fb.group({ day: [d.day || '', Validators.required], timeSlots: this.fb.array([]) });
            const slotsArr = dayGroup.get('timeSlots') as FormArray;
            (d.timeSlots || []).forEach((s: any) => {
              slotsArr.push(this.fb.group({ from: [s.from || '', Validators.required], to: [s.to || '', Validators.required] }));
            });
            if (slotsArr.length === 0) slotsArr.push(this.createTimeSlotGroup());
            this.daysControls.push(dayGroup);
          });
        }
      }

      // proof
      if (Array.isArray(item.establishmentProof) && item.establishmentProof.length) {
        const p = item.establishmentProof[0];
        if (p && p.url) {
          this.establishmentProofUrl = p.url;
          this.establishmentForm.patchValue({ establishmentProof: p.fileName || p.url });
        }
      }
    } catch (err) {
      console.warn('Failed to patch edit values', err);
    }
  }

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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('storage', this.onStorageEvent);
  }

  // ----------------------------
  // Auth helpers
  // ----------------------------
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

  // disable a day option if used by another row (keeps logic simple)
  isOptionDisabled(optionValue: string, rowIndex: number): boolean {
    const used = this.daysControls.controls.some((ctrl, idx) => {
      if (idx === rowIndex) return false;
      const val = ctrl.get('day')?.value ?? '';
      return val === optionValue;
    });
    return used;
  }

  // ----------------------------
  // UI actions
  // ----------------------------
  previousSlide(): void {
    if (this.currentSlide === 2) {
      this.currentSlide = 1;
      this.count = 1;
    } else {
      this.router.navigate(['/']);
    }
  }

  // Save draft before moving to next slide
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

    // store draft before advancing
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

  // ----------------------------
  // onSubmit -> builds payload in requested format and logs it
  // ----------------------------
  isSubmitting = false;

  onSubmit(): void {
    // Save draft at submit time too (per your request)
    try {
      this.saveDraft();
    } catch (err) {
      console.warn('Failed to save draft to localStorage on submit', err);
    }

    const formValue = this.establishmentForm.value;

    // process days/timeSlots (supporting 'all' selection)
    const weekDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const daysData: any = {};
    this.daysControls.controls.forEach((dayCtrl: any) => {
      const day = dayCtrl.get('day')?.value;
      const slots = (dayCtrl.get('timeSlots') as any).value.map((s: any) => ({
        slot: 'morning', // keep same mapping as before
        from: s.from,
        to: s.to,
      }));

      if (day === 'all') {
        weekDays.forEach((wd) => (daysData[wd] = slots));
      } else {
        daysData[day] = slots;
      }
    });

    const payload = {
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
        // state: formValue.address.state,
        sampleCityName: formValue.address.sampleCityName || formValue.address.city || '',
        pincode: formValue.address.pincode,
        country: 'India',
      },
      establishmentMobile: '',
      establishmentEmail: '',
      location: {
        // keep the same coords order you used elsewhere
        coordinates: [this.location[0], this.location[1]],
      },
      consultationFees: formValue.consultationFees,
      videoConsultationFees: formValue.videoConsultationFees,
      establishmentProof: this.establishmentProofUrl
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
      isOwner: 1,
    };

    console.log('Final payload:', payload);

    // optional UI flags
    this.isSubmitting = true;

    // get token (adjust storage key as used in your app)
    const token = this.safeDecrypt(localStorage.getItem('authToken'));

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    });

    // url: use environment or hardcode local dev URL
    const url = `http://localhost:3000/doctor/doctor-add-establishment`;

    this.http
      .post(url, payload, { headers })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (resp: any) => {
          console.log('API success response:', resp);

          // push to local list (keep same shape you used)
          this.establishmentsList.push({
            name: payload.name || 'Unnamed',
            consultationType: payload.Consultation_type || 'own',
          });
          console.log('Establishment saved locally:', payload);

          // clear draft after successful save
          try {
            this.clearDraftForCurrentUser();
          } catch (err) {
            console.warn('Failed to clear draft', err);
          }

          // navigate after success
          this.router.navigate(['/doc-establishment']);
        },
        error: (err) => {
          console.error('API error:', err);
          // show friendly message to user
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
    };
    reader.readAsDataURL(file);
  }
  removeFile(): void {
    this.establishmentProofFile = null;
    this.establishmentProofUrl = null;
    this.establishmentForm.patchValue({ establishmentProof: '' });
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

  getDayControl(i: number): FormGroup {
    return this.daysControls.at(i) as FormGroup;
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

  // pincode input normalizer (removes non-digits)
  onPincodeInput(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '');
    // also update the form control value
    const addr = this.establishmentForm.get('address');
    if (addr) {
      addr.get('pincode')?.setValue(input.value);
    }
  }

  /**
   * onSelectPlace
   */
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

        // parse components
        for (const component of addressComponents) {
          // combine street-like parts into landmark
          if (this.streetArray.some((i) => component.types.includes(i))) {
            address.landmark += component.long_name + ', ';
            continue;
          }
          // combine locality parts
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
              // map to stateList if available; otherwise keep name
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

        // clean trailing commas
        address.landmark = address.landmark.replace(/,\s*$/, '').trim();
        address.locality = address.locality.replace(/,\s*$/, '').trim();

        // Patch the form depending on source
        this.applyAddressToForm(address, placeDetails, source);

        // coordinates
        if (placeDetails.geometry && placeDetails.geometry.location) {
          const lat = placeDetails.geometry.location.lat();
          const lng = placeDetails.geometry.location.lng();
          this.location = [lng, lat];
          const locControl = this.establishmentForm.get('location');
          if (locControl) locControl.patchValue({ coordinates: [lng, lat] });
        }

        // clear suggestions
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

  /**
   * Returns a best-effort current user identifier.
   * - Tries to get a user id from localStorage 'authUser' (decrypted if needed).
   * - Falls back to a persistent deviceId stored in localStorage (will create it if missing).
   */
  private getCurrentUserIdentifier(): string {
    // Try to read authUser (common key). Many apps keep user object in authUser.
    try {
      const rawAuthUser = localStorage.getItem('authUser');
      if (rawAuthUser) {
        // try decrypting if crypto provider expects it
        try {
          const dec = this.crypto.decryptObj(rawAuthUser);
          if (dec && typeof dec === 'object' && (dec._id || dec.id || dec.userId)) {
            return String(dec._id || dec.id || dec.userId);
          }
        } catch (e) {
          // fallback: try parse as JSON
          try {
            const parsed = JSON.parse(rawAuthUser);
            if (parsed && (parsed._id || parsed.id || parsed.userId)) {
              return String(parsed._id || parsed.id || parsed.userId);
            }
          } catch (ee) {
            // not JSON - ignore
          }
        }
      }
    } catch (err) {
      // intentionally silent - we'll fallback
    }

    // fallback to deviceId stored in localStorage (create one if missing)
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = this.generateUUID();
      try {
        localStorage.setItem('deviceId', deviceId);
      } catch (e) {
        // storage might be denied — return a short random fallback (non-persistent)
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
      // store proof preview and file name (can't store actual File object)
      proof: {
        url: this.establishmentProofUrl,
        fileName: this.establishmentForm.get('establishmentProof')?.value || null,
      },
      // store location coords
      location: this.location,
    };

    try {
      localStorage.setItem(key, JSON.stringify(draftObj));
    } catch (err) {
      // possible QUOTA_EXCEEDED_ERR
      console.warn('Could not save establishment draft to localStorage', err);
    }
  }

  private loadDraftIfExists(): void {
    const key = this.draftKeyForCurrentUser();
    const raw = localStorage.getItem(key);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);

      // ensure meta.userId matches current identifier (defensive)
      const currentId = this.getCurrentUserIdentifier();
      if (!parsed.meta || parsed.meta.userId !== currentId) {
        // mismatch -> do not bind
        return;
      }

      const savedForm = parsed.form || {};
      const savedProof = parsed.proof || {};
      const savedLocation = parsed.location || null;

      // Patch simple controls
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

      // Address group
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

      // days/timeSlots: replace FormArray with saved data if present
      if (Array.isArray(savedForm.days) && savedForm.days.length) {
        // clear current
        while (this.daysControls.length > 0) {
          this.daysControls.removeAt(0);
        }
        // recreate from saved
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

      // location coords
      if (savedLocation && Array.isArray(savedLocation) && savedLocation.length === 2) {
        this.location = savedLocation;
      }

      // proof image preview and file name
      if (savedProof && savedProof.url) {
        this.establishmentProofUrl = savedProof.url;
        // If user previously saved file name into establishmentProof control, restore it
        if (savedProof.fileName) {
          this.establishmentForm.patchValue({ establishmentProof: savedProof.fileName });
        }
      }

      // Optionally: decide which slide to show - keep on step 1 unless days are present
      if (Array.isArray(savedForm.days) && savedForm.days.length > 0) {
        // don't auto-advance UI, just keep form populated — user will press next
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
    // RFC4122 v4-ish simple implementation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Try to decrypt using crypto provider if available; otherwise return raw
   */
  private safeDecrypt(maybeEncrypted: string | null): string {
    if (!maybeEncrypted) return '';
    try {
      const dec = this.crypto.decryptObj(maybeEncrypted);
      if (typeof dec === 'string') return dec;
      // if decrypt returns object with token property
      if (dec && typeof dec === 'object' && dec.token) return String(dec.token);
      return String(dec);
    } catch (e) {
      // fallback: maybe it's plain token already
      return maybeEncrypted;
    }
  }

}

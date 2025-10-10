// src/app/features/establishment/establishment.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
// HttpClient and HttpHeaders are no longer needed here
import { finalize } from 'rxjs/operators';
// CryptoProvider is no longer needed here
import { catchError, map } from 'rxjs/operators';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { FormsModule } from '@angular/forms';

// Angular Material modules used in the template
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

// Import the new service
import { EstablishmentService } from '../../core/services/establishment.service'; 
// Note: We keep 'declare const google: any;' because the component still uses it 
// in event handlers, though the core logic is in the service.
declare const google: any; 

type DayOption = { value: string; label: string };

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
  templateUrl: './establishment.component.html',
  styleUrls: ['./establishment.component.scss'],
})
export class EstablishmentComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // UI state
  currentSlide = 1;
  count = 1;
  isEditMode = false;
  errorMessage = '';
  establishmentProofUrl: string | null = null;
  establishmentProofFile?: File | null = null;
  isSubmitting = false; // Moved from private to public/used in template

  // form
  establishmentForm: FormGroup;

  // constants (still defined here to avoid importing a huge constant structure just for the component)
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

  timingArray = [
    { name: '09:00 AM' }, { name: '09:30 AM' }, { name: '10:00 AM' }, { name: '10:30 AM' },
    { name: '11:00 AM' }, { name: '11:30 AM' }, { name: '12:00 PM' }, { name: '12:30 PM' },
    { name: '01:00 PM' }, { name: '01:30 PM' }, { name: '02:00 PM' }, { name: '02:30 PM' },
    { name: '03:00 PM' }, { name: '03:30 PM' }, { name: '04:00 PM' }, { name: '04:30 PM' },
    { name: '05:00 PM' },
  ];

  establishmentsList: Array<{ name: string; consultationType: string }> = [];

  // Places-related
  predicationList: Array<{ description: string; place_id: string }> = [];
  predicationCityList: Array<{ description: string; place_id: string }> = [];
  location: number[] = [77.216721, 28.6448]; // [lng, lat]
  stateList: Array<{ _id: string; name: string }> = []; // populate from API if available


  // Inject service instead of http and crypto
  constructor(
    private router: Router,
    private fb: FormBuilder,
    private establishmentService: EstablishmentService, // <-- New Service
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
    if (!this.establishmentService.hasValidToken()) {
      this.clearToken();
      this.router.navigate(['/auth/login']);
      return;
    }

    // Check if user already has establishments
    this.establishmentService.checkExistingEstablishments()
      .subscribe((hasAny: boolean) => {
        if (hasAny) {
          this.router.navigate(['/doc-establishment']);
          return;
        }

        this.loadDraftIfExists();
        window.addEventListener('storage', this.onStorageEvent);
      });
  }

  // Auth helpers (simplified)
  private clearToken(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  }

  private onStorageEvent = (ev: StorageEvent) => {
    const relevantKeys = ['authToken', 'authUser', 'deviceId'];
    if (ev.key === null || relevantKeys.includes(ev.key)) {
      if (!this.establishmentService.hasValidToken()) {
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
  // Form helpers: days & timeSlots (MUST remain here as they manipulate the FormGroup)
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
  isOptionDisabled(optionValue: string, rowIndex: number): boolean {
    const used = this.daysControls.controls.some((ctrl, idx) => {
      if (idx === rowIndex) return false;
      const val = ctrl.get('day')?.value ?? '';
      return val === optionValue;
    });
    return used;
  }
  getDayControl(i: number): FormGroup {
    return this.daysControls.at(i) as FormGroup;
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

    // Delegate draft saving to service
    this.saveDraft();

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
  // Submission
  // ----------------------------
  onSubmit(): void {
    this.saveDraft(); // Save draft at submit time too
    
    this.isSubmitting = true;

    // 1. Build Payload using the service
    const payload = this.establishmentService.buildPayload(
        this.establishmentForm.getRawValue(),
        this.daysControls,
        this.location,
        this.establishmentProofUrl
    );
    
    console.log('Final payload:', payload);

    // 2. Submit via service
    this.establishmentService.submitEstablishment(payload)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (resp: any) => {
          console.log('API success response:', resp);

          this.establishmentsList.push({
            name: payload.name || 'Unnamed',
            consultationType: payload.Consultation_type || 'own',
          });
          console.log('Establishment saved locally:', payload);

          // Clear draft via service
          this.establishmentService.clearDraft();

          this.router.navigate(['/doc-establishment']);
        },
        error: (err) => {
          console.error('API error:', err);
          this.errorMessage = 'Failed to submit establishment. Please try again.';
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

  closeModal(_id?: string) {
    // placeholder for modal close
  }

  // ---------- Places autocomplete helpers (Delegating core logic) ----------
  onSearch(event: any, listName: 'predicationList' | 'predicationCityList') {
    const search = (event.target?.value || '').trim();
    
    this.establishmentService.getPlacePredictions(search, listName, (predictions) => {
        (this as any)[listName] = predictions;
    });
  }

  displayPlace(place: any): string {
    return place ? place.description || '' : '';
  }

  // pincode input normalizer
  onPincodeInput(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '');
    const addr = this.establishmentForm.get('address');
    if (addr) {
      addr.get('pincode')?.setValue(input.value);
    }
  }

  /**
   * onSelectPlace
   */
  onSelectPlace(placeObj: { description?: string; place_id?: string } | any, source: 'landmark' | 'city' = 'landmark') {
    const placeId = placeObj.place_id ?? placeObj.placeId ?? null;
    if (!placeId) return;

    this.establishmentService.getPlaceDetails(placeId, this.stateList, (details) => {
        if (details) {
            this.applyAddressToForm(details.address, source);
            this.location = details.location;
        }
        
        // clear suggestions
        this.predicationList = [];
        this.predicationCityList = [];
    });
  }

  private applyAddressToForm(address: any, source: 'landmark' | 'city') {
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
  // Local storage: draft management (Delegated to service)
  // ----------------------------

  private saveDraft(): void {
    try {
      this.establishmentService.saveDraft(
        this.establishmentForm.getRawValue(),
        this.establishmentProofUrl,
        this.location
      );
    } catch (err) {
      console.warn('Failed to save draft to localStorage', err);
    }
  }

  private loadDraftIfExists(): void {
    const parsed = this.establishmentService.loadDraft();
    if (!parsed) return;

    try {
      const savedForm = parsed.form || {};
      const savedProof = parsed.proof || {};
      const savedLocation = parsed.location || null;

      // Patch simple controls
      const simpleKeys = [
        'showInClinic', 'showVideo', 'Consultation_type', 'name', 
        'hospitalTypeId', 'proofType', 'establishmentProof', 
        'consultationFees', 'videoConsultationFees',
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

      // location coords
      if (savedLocation && Array.isArray(savedLocation) && savedLocation.length === 2) {
        this.location = savedLocation;
      }

      // proof image preview and file name
      if (savedProof && savedProof.url) {
        this.establishmentProofUrl = savedProof.url;
        if (savedProof.fileName) {
          this.establishmentForm.patchValue({ establishmentProof: savedProof.fileName });
        }
      }

    } catch (err) {
      console.warn('Failed to apply establishment draft:', err);
    }
  }
}
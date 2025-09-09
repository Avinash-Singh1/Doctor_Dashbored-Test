// src/app/features/establishment/establishment.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
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

type DayOption = { value: string; label: string };

@Component({
  selector: 'app-establishment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './establishment.component.html',
  styleUrls: ['./establishment.component.scss'],
})
export class EstablishmentComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // UI state
  currentSlide = 1; // 1 or 2
  count = 1; // step counter
  isEditMode = false;
  errorMessage = '';
  establishmentProofUrl: string | null = null;
  establishmentProofFile?: File | null = null;

  // form
  establishmentForm: FormGroup;

  // static lists used in the form
  hospitalTypeList = [
    { _id: 'clinic', name: 'Clinic' },
    { _id: 'hospital', name: 'Hospital' },
    { _id: 'diagnostic', name: 'Diagnostic Center' },
  ];
  establishmentProofOptions = ['GST Certificate', 'Trade License', 'Other'];

  additionalOptions: DayOption[] = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' },
  ];

  // timing values (simplified)
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

  // local list of saved establishments (demo)
  establishmentsList: Array<{ name: string; consultationType: string }> = [];

  constructor(private router: Router, private fb: FormBuilder) {
    // Build reactive form with nested address FormGroup and days FormArray
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
      }),
      proofType: ['', Validators.required],
      establishmentProof: ['', Validators.required],
      consultationFees: [''],
      videoConsultationFees: [''],
      days: this.fb.array([
        this.fb.group({
          day: ['', Validators.required],
          timeSlots: this.fb.array([this.createTimeSlotGroup()]),
        }),
      ]),
    });
  }

  ngOnInit(): void {
    // immediate token check (local-only)
    if (!this.hasValidToken()) {
      this.clearToken();
      this.router.navigate(['/auth/login']);
      return;
    }

    // listen for cross-tab storage changes (logout, etc.)
    window.addEventListener('storage', this.onStorageEvent);
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
  // Auth helpers (local-only)
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

  // disable a day option if used by another row
  isOptionDisabled(optionValue: string, rowIndex: number): boolean {
    return this.daysControls.controls.some(
      (ctrl, idx) => idx !== rowIndex && (ctrl.get('day')?.value ?? '') === optionValue
    );
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

  onSubmit(): void {
    const days = this.daysControls.controls.map((d) => {
      const timeSlots = ((d.get('timeSlots') as FormArray).controls || []).map((s) => ({
        from: s.get('from')?.value,
        to: s.get('to')?.value,
      }));
      return { day: d.get('day')?.value, timeSlots };
    });

    let ok = true;
    days.forEach((d) => {
      if (!d.day) ok = false;
      if (!d.timeSlots || d.timeSlots.length === 0) ok = false;
      d.timeSlots.forEach((s: any) => {
        if (!s.from || !s.to) ok = false;
      });
    });
    if (!ok) {
      this.errorMessage = 'Please fill valid days and times in Step 2';
      this.markAllAsTouched(this.establishmentForm);
      return;
    }

    const payload = {
      ...this.establishmentForm.value,
      days,
      establishmentProofPreview: this.establishmentProofUrl,
      createdAt: new Date().toISOString(),
    };

    this.establishmentsList.push({
      name: payload.name || 'Unnamed',
      consultationType: payload.Consultation_type || 'own',
    });

    console.log('Establishment saved locally:', payload);

    // navigate or reset as needed
    this.router.navigate(['/doc-establishment']);
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
}

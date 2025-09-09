// src/app/features/medical-verification/medical-verification.component.ts
import { Component, OnInit, Renderer2, Inject, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Subject, of } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-medical-verification',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './medical-verification.component.html',
  styleUrls: ['./medical-verification.component.scss']
})
export class MedicalVerificationComponent implements OnInit, OnDestroy {
  consultationForm!: FormGroup;
  profileForm!: FormGroup;
  getFormValues: any;

  // local menu items (example). Replace with your real menu data if needed.
  menuItems = [
    { label: 'Dashboard', routerLink: '/doctor/dashboard', icon: 'assets/images/icon-dashboard.svg', alt: 'dashboard', hasSubmenu: false },
    { label: 'Profile', routerLink: '/doctor/profile', icon: 'assets/images/icon-profile.svg', alt: 'profile', hasSubmenu: false },
    { label: 'Settings', routerLink: '#', icon: 'assets/images/icon-settings.svg', alt: 'settings', hasSubmenu: true, submenu: [
      { label: 'Sub 1', routerLink: '/doctor/settings/sub1', icon: 'assets/images/icon-sub1.svg', alt: 'sub1' }
    ]}
  ];

  identityProofOptions = ['Aadhar Card', 'Driving Licence', 'Voter Card', 'Any Other Govt. ID'];
  medicalProofOptions = ['Medical Council Reg. Certificate', 'Professional Licence', 'Experience Certificate'];

  identityProofUrl: string | null = null;
  medicalProofUrl: string | null = null;
  identityProofFilename: string | null = null;
  medicalProofFilename: string | null = null;

  isSubmenuOpen = false;
  isMenuHidden = false;

  private destroy$ = new Subject<void>();

  constructor(
    private renderer: Renderer2,
    private fb: FormBuilder,
    private router: Router,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    // Build forms
    this.consultationForm = this.fb.group({
      consultationType: ['In-clinic'],
      consultationDetails: this.fb.group({
        isVideo: [true],
        isInClinic: [{ value: true, disabled: true }]
      }),
      regNum: ['', Validators.required],
      regCouncil: ['', Validators.required],
      regYear: ['', Validators.required],
      identityProof: ['', Validators.required],
      medicalProof: ['', Validators.required],
      identityFile: [null],
      medicalFile: [null]
    });

    this.profileForm = this.fb.group({
      profilePic: [''],
      fullName: ['', [Validators.required]],
      specialization: [null, [Validators.required]],
      experience: [null, [Validators.required]],
      about: ['', [Validators.required]]
    });

    // Attempt to load previously saved draft from localStorage (local-only)
    const draft = localStorage.getItem('medicalVerificationDraft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        // patch forms if structure matches
        if (parsed?.records?.doctor) {
          const doc = parsed.records.doctor;
          this.consultationForm.patchValue({
            regNum: doc?.medicalRegistration?.registrationNumber || '',
            regCouncil: doc?.medicalRegistration?.council || '',
            regYear: doc?.medicalRegistration?.year || '',
            identityProof: doc?.identityProof?.[0]?.urlType || '',
            medicalProof: doc?.medicalProof?.[0]?.urlType || ''
          });
          this.identityProofUrl = doc?.identityProof?.[0]?.url || null;
          this.medicalProofUrl = doc?.medicalProof?.[0]?.url || null;
          this.identityProofFilename = doc?.identityProof?.[0]?.filename || null;
          this.medicalProofFilename = doc?.medicalProof?.[0]?.filename || null;
        }
        if (parsed?.profile) {
          this.profileForm.patchValue({ fullName: parsed.profile.fullName || '' });
        }
      } catch (e) {
        console.warn('Invalid draft in localStorage');
      }
    }

    this.addFacebookPixelEventScript();

    // storage event (cross-tab) — simple check for token-like key (app-specific)
    window.addEventListener('storage', this.onStorageEvent);
  }

  // local "upload" - no network calls, returns a data URL (image/pdf) for preview and storage
  private readFileAsDataUrl(file: File) {
    return new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  async onFileSelected(event: Event, controlName: string) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a valid file (PNG, JPG, JPEG, or PDF).');
      return;
    }

    // read locally (for preview and local storage)
    const dataUrl = await this.readFileAsDataUrl(file);
    if (!dataUrl) {
      alert('Failed to read file.');
      return;
    }

    if (controlName === 'identityProof') {
      this.identityProofUrl = dataUrl;
      this.identityProofFilename = file.name;
      this.consultationForm.patchValue({ identityFile: file });
    } else if (controlName === 'medicalProof') {
      this.medicalProofUrl = dataUrl;
      this.medicalProofFilename = file.name;
      this.consultationForm.patchValue({ medicalFile: file });
    }
  }

  removeFile(controlName: string) {
    if (controlName === 'identityProof') {
      this.identityProofUrl = null;
      this.identityProofFilename = null;
      this.consultationForm.patchValue({ identityFile: null, identityProof: '' });
    }
    if (controlName === 'medicalProof') {
      this.medicalProofUrl = null;
      this.medicalProofFilename = null;
      this.consultationForm.patchValue({ medicalFile: null, medicalProof: '' });
    }
  }
  confirmRemove(controlName: string): void {
  const label = controlName === 'identityProof' ? 'identity proof' : 'medical proof';
  const confirmed = confirm(`Are you sure you want to remove the uploaded ${label}?`);
  if (confirmed) {
    this.removeFile(controlName);
  }
}


  onDropdownChange() {
    this.consultationForm.updateValueAndValidity();
  }

  // Helper to determine if dataURL points to an image (for preview)
  isImage(dataUrl: string | null): boolean {
    if (!dataUrl) return false;
    return dataUrl.startsWith('data:image/');
  }

  // Save locally to localStorage and navigate (no external calls)
  onSubmit(): void {
    this.consultationForm.markAllAsTouched();

    if (!this.consultationForm.valid) {
      alert('Please provide all required fields.');
      return;
    }

    if (!this.identityProofUrl || !this.medicalProofUrl) {
      alert('Please upload identity proof and medical proof files.');
      return;
    }

    // Build payload (same structure as the reference)
    const formValue = this.consultationForm.getRawValue();
    const payload = {
      steps: 2,
      isEdit:
        formValue.regNum !== '' &&
        formValue.regCouncil !== '' &&
        formValue.consultationType !== '',
      isSaveAndExit: false,
      records: {
        doctor: {
          medicalRegistration: {
            registrationNumber: formValue.regNum,
            council: formValue.regCouncil,
            year: formValue.regYear
          },
          identityProof: [
            {
              url: this.identityProofUrl,
              filename: this.identityProofFilename,
              fileType: 'local',
              urlType: formValue.identityProof
            }
          ],
          medicalProof: [
            {
              url: this.medicalProofUrl,
              filename: this.medicalProofFilename,
              fileType: 'local',
              urlType: formValue.medicalProof
            }
          ]
        },
        consultationType: formValue.consultationType || 'In-clinic',
        consultationDetails: {
          isVideo: true,
          isInClinic: true
        }
      },
      profile: {
        fullName: this.profileForm.get('fullName')?.value || ''
      }
    };

    // Save draft locally (replace this with a real API call later)
    localStorage.setItem('medicalVerificationDraft', JSON.stringify(payload));
    // visual feedback
    alert('Profile saved locally (no external service). Payload stored in localStorage under "medicalVerificationDraft".');

    // navigate to next step (example)
    this.router.navigate(['/establishment']).catch(err => {
      // swallow navigation errors in dev
      console.warn('Navigation failed', err);
    });
  }

  // UI/menu utilities (copied from reference)
  settingtoggleSubmenu(event: Event): void {
    event.preventDefault();
    this.isSubmenuOpen = !this.isSubmenuOpen;
  }

  onMenuClick(): void {
    const sideMenu = document.getElementById('sideMenu');
    const innerArea = document.getElementById('clickToCloseArea');
    if (sideMenu) {
      if (sideMenu.classList.contains('mobileMenu') && innerArea?.classList.contains('openedSideBar')) {
        this.renderer.removeClass(sideMenu, 'mobileMenu');
        this.renderer.removeClass(innerArea, 'openedSideBar');
      } else {
        this.renderer.addClass(sideMenu, 'mobileMenu');
        this.renderer.addClass(innerArea as Element, 'openedSideBar');
      }
    }
  }

  closeSideBar(): void {
    const innerArea = document.getElementById('clickToCloseArea');
    const sideMenu = document.getElementById('sideMenu');
    if (innerArea?.classList.contains('openedSideBar')) {
      this.renderer.removeClass(innerArea, 'openedSideBar');
      this.renderer.removeClass(sideMenu as Element, 'mobileMenu');
    }
  }

  onCloseMenuClick(event: Event): void {
    event.stopPropagation();
    const sideMenu = document.getElementById('sideMenu');
    if (sideMenu && sideMenu.classList.contains('mobileMenu')) {
      this.renderer.removeClass(sideMenu, 'mobileMenu');
    }
  }

  toggleSubmenu(event: Event): void {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    const submenu = target.nextElementSibling as HTMLElement;
    if (submenu) {
      submenu.style.display = submenu.style.display === 'block' ? 'none' : 'block';
      const allSubmenus = document.querySelectorAll('.submenu');
      allSubmenus.forEach((sm) => {
        if (sm !== submenu) { (sm as HTMLElement).style.display = 'none'; }
      });
    }
  }

  // small FB pixel snippet — same as reference (keeps inline script)
  addFacebookPixelEventScript(): void {
    const fbqScript = this.renderer.createElement('script');
    fbqScript.type = 'text/javascript';
    fbqScript.text = `
      try {
        fbq('track', 'CompleteRegistration', {
          value: 1,
          currency: 'USD'
        });
      } catch(e) { /* ignore if fbq isn't present */ }
    `;
    const head = this.document.head;
    this.renderer.appendChild(head, fbqScript);
    head.appendChild(fbqScript);
  }

  onInput(event: any): void {
    event.target.value = event.target.value.replace(/[^0-9]/g, '');
  }

  toggleMenu(): void {
    this.isMenuHidden = !this.isMenuHidden;
  }

  // respond to storage clears (basic)
  private onStorageEvent = (ev: StorageEvent) => {
    const relevantKeys = ['authToken', 'authUser', 'deviceId'];
    if (ev.key === null || relevantKeys.includes(ev.key)) {
      // app-specific behaviour — here we simply log
      console.log('storage event for keys of interest detected:', ev.key);
    }
  };

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('storage', this.onStorageEvent);
  }
}

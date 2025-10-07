// src/app/features/medical-verification/medical-verification.component.ts
import { Component, OnInit, Renderer2, Inject, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { CryptoProvider } from '../../core/services/crypto.service';

@Component({
  selector: 'app-medical-verification',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule],
  templateUrl: './medical-verification.component.html',
  styleUrls: ['./medical-verification.component.scss']
})
export class MedicalVerificationComponent implements OnInit, OnDestroy {
  consultationForm!: FormGroup;
  profileForm!: FormGroup;
  getFormValues: any;

  // Base URL - change to your environment value if needed
  private readonly API_BASE = 'http://localhost:3000';

  // Profile endpoint (from your request)
  private readonly PROFILE_API = 'http://82.112.237.181:8080/api/v1/setting/profile';

  // Hard-coded AWS default images (from your reference payload)
  private readonly DEFAULT_IDENTITY_URL =
    'https://nector-prod.s3.ap-south-1.amazonaws.com/0aaa5390-9783-11f0-8e82-1168173a397f-Auli_Skiing_Adventure.jpg';
  private readonly DEFAULT_MEDICAL_URL =
    'https://nector-prod.s3.ap-south-1.amazonaws.com/0aa830b0-9783-11f0-8e82-1168173a397f-alleppey-backwater-cruise.jpg';

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

  // These are used for local preview and filename display only
  identityProofUrl: string | null = null; // data URL for preview
  medicalProofUrl: string | null = null;  // data URL for preview
  establishmentProofUrl: string | null = null;
  identityProofFilename: string | null = null;
  medicalProofFilename: string | null = null;

  isSubmenuOpen = false;
  isMenuHidden = false;

  private destroy$ = new Subject<void>();

  constructor(
    private renderer: Renderer2,
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient,
    private crypto: CryptoProvider,
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
      medicalFile: [null],
      establishmentFile: [null]
    });

    this.profileForm = this.fb.group({
      profilePic: [''],
      fullName: ['', [Validators.required]],
      specialization: [null, [Validators.required]],
      experience: [null, [Validators.required]],
      about: ['', [Validators.required]]
    });

    // Fetch server-side profile and patch forms (replaces previous localStorage patching)
    this.fetchProfileAndPatch();

    this.addFacebookPixelEventScript();

    // storage event (cross-tab) — simple check for token-like key (app-specific)
    window.addEventListener('storage', this.onStorageEvent);
  }

  /**
   * Fetch profile data from configured PROFILE_API and patch forms.
   * - Uses CryptoProvider to read token if available
   * - Safely patches values with fallback defaults
   */
  private fetchProfileAndPatch(): void {
    // Build headers; add auth if available
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    try {
      const rawToken = localStorage.getItem('authToken');
      if (rawToken) {
        const token = this.crypto.decryptObj(rawToken);
        if (token) {
          headers = headers.set('Authorization', `Bearer ${token}`);
        }
      }
    } catch (e) {
      console.warn('Could not read/decrypt auth token', e);
    }

    this.http.get<any>(this.PROFILE_API, { headers })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          // Expecting the structure you provided: res.result is an array
          if (res?.success && Array.isArray(res.result) && res.result.length > 0) {
            // take first result object
            this.getFormValues = res.result[0];

            // Patch profile form
            this.profileForm.patchValue({
              profilePic: this.getFormValues?.doctor?.profilePic || this.getFormValues?.doctor?.profilePic || '',
              fullName: this.getFormValues?.fullName || '',
              experience: this.getFormValues?.doctor?.experience || '',
              specialization: this.getFormValues?.doctor?.specialization || [],
              about: this.getFormValues?.doctor?.about || ''
            });

            // Patch consultation form
            const doc = this.getFormValues?.doctor || {};
            this.consultationForm.patchValue({
              consultationType: doc?.consultationType || 'In-clinic',
              consultationDetails: {
                isVideo: doc?.consultationDetails?.isVideo ?? true,
                isInClinic: doc?.consultationDetails?.isInClinic ?? true
              },
              regNum: doc?.medicalRegistration?.[0]?.registrationNumber || '',
              regCouncil: doc?.medicalRegistration?.[0]?.council || '',
              regYear: doc?.medicalRegistration?.[0]?.year || '',
              identityProof: doc?.identityProof?.[0]?.urlType || '',
              medicalProof: doc?.medicalProof?.[0]?.urlType || '',
              establishmentFile: doc?.establishmentProof?.[0]?.urlType || ''
            });

            // preview URLs & filenames (for UI)
            this.identityProofUrl = doc?.identityProof?.[0]?.url || null;
            this.medicalProofUrl = doc?.medicalProof?.[0]?.url || null;
            this.establishmentProofUrl = doc?.establishmentProof?.[0]?.url || null;

            this.identityProofFilename = doc?.identityProof?.[0]?.filename || null;
            this.medicalProofFilename = doc?.medicalProof?.[0]?.filename || null;
          } else {
            console.warn('Profile API returned no result', res);
          }
        },
        error: (err) => {
          console.error('Failed to fetch profile data', err);
          // Inform the user but do not block them (they can still fill form)
          alert('Failed to load profile data. You can continue filling the form.');
        }
      });
  }

  // local "upload" - read file as data URL for preview only (no base64 sent to backend)
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

    // read locally (for preview and local storage) — keep this behaviour
    const dataUrl = await this.readFileAsDataUrl(file);
    if (!dataUrl) {
      alert('Failed to read file.');
      return;
    }

    if (controlName === 'identityProof') {
      // keep previewing the uploaded file locally
      this.identityProofUrl = dataUrl;
      this.identityProofFilename = file.name;
      this.consultationForm.patchValue({ identityFile: file });
    } else if (controlName === 'medicalProof') {
      this.medicalProofUrl = dataUrl;
      this.medicalProofFilename = file.name;
      this.consultationForm.patchValue({ medicalFile: file });
    } else if (controlName === 'establishmentProof') {
      this.establishmentProofUrl = dataUrl;
      this.consultationForm.patchValue({ establishmentFile: file });
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
    if (controlName === 'establishmentProof') {
      this.establishmentProofUrl = null;
      this.consultationForm.patchValue({ establishmentFile: null });
    }
  }

  confirmRemove(controlName: string): void {
    const label = controlName === 'identityProof' ? 'identity proof' : (controlName === 'medicalProof' ? 'medical proof' : 'establishment proof');
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

  /**
   * Submit:
   * - keep local upload/preview behaviour
   * - build payload but ALWAYS use hard-coded AWS URLs for proofs (do not send base64)
   */
  onSubmit(): void {
    this.consultationForm.markAllAsTouched();

    if (!this.consultationForm.valid) {
      alert('Please provide all required fields.');
      return;
    }

    // Build payload (use AWS defaults for images; uploaded files used only for preview/filename)
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
          // always send the AWS default URLs (hard-coded)
          identityProof: [
            {
              url: this.DEFAULT_IDENTITY_URL,
              filename: this.identityProofFilename || 'identity_default.jpg',
              fileType: 'image',
              urlType: formValue.identityProof || 'Aadhar Card'
            }
          ],
          medicalProof: [
            {
              url: this.DEFAULT_MEDICAL_URL,
              filename: this.medicalProofFilename || 'medical_default.jpg',
              fileType: 'image',
              urlType: formValue.medicalProof || 'Medical Council Reg. Certificate'
            }
          ]
        },
        consultationType: formValue.consultationType || 'In-clinic',
        consultationDetails: {
          isVideo: formValue.consultationDetails?.isVideo ?? true,
          isInClinic: formValue.consultationDetails?.isInClinic ?? true
        }
      },
      profile: {
        fullName: this.profileForm.get('fullName')?.value || ''
      }
    };

    // Save draft locally (still helpful fallback)
    localStorage.setItem('medicalVerificationDraft', JSON.stringify(payload));
    console.log('Payload (using AWS defaults for proof images):', payload);

    // Call backend API
    let token: string | null = null;
    try {
      token = this.crypto.decryptObj(localStorage.getItem('authToken'));
    } catch (e) {
      console.warn('Failed to decrypt token', e);
    }
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.put(`${this.API_BASE}/doctor/update-profile`, payload, { headers })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          console.log('API response:', res);
          // optionally clear draft on success
          localStorage.removeItem('medicalVerificationDraft');
          alert('Medical verification submitted successfully.');
          this.router.navigate(['/establishment']).catch(err => {
            console.warn('Navigation failed', err);
          });
        },
        error: (err) => {
          console.error('API error:', err);
          const serverMessage = err?.error?.msgCode || err?.error?.message || 'Failed to submit verification. Please try again.';
          alert(serverMessage);
        }
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

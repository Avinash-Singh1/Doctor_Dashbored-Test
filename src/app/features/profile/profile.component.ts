import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { CryptoProvider } from '../../core/services/crypto.service';   // <-- assumes you have this
import { environment } from '../../../environments/environment';
// If you already have AuthService in your app, you can keep it injected;
// otherwise this comp works without it (it will call the APIs without auth headers).
class AuthServiceLike {
  hasValidToken?: () => boolean;
  clearToken?: () => void;
  isLoggedIn$?: () => any;
  // Add a method to get the ID if needed outside of localStorage
  getUserId?: () => string; 
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule,RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit, OnDestroy {
  // ──────────────────────────────
  // CONFIG
  // ──────────────────────────────
  private destroy$ = new Subject<void>();
  private BASE_URL = `${environment.baseUrl2}/api/v1`;
  private SETTINGS_URL = `${this.BASE_URL}/setting/list`; // The PUT endpoint

  // Type constants for the API payload 'type' field
  private SETTING_TYPE = {
    EDUCATION: 1,
    AWARD: 2,
    MEMBERSHIP: 4,
    SOCIAL: 8,
  };

  // Optional: if you have AuthService in your app, Angular DI will provide it;
  private auth = inject<AuthServiceLike>(AuthServiceLike as any, { optional: true });
  private http = inject(HttpClient);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private crypto = inject(CryptoProvider);

  // ──────────────────────────────
  // UI / FORM STATE
  // ──────────────────────────────
  getFormValues: any = null; // merged profile used by read-only section
  profileForm!: FormGroup;
  isProfilePic = false;

  specializationList: Array<{ _id: string; name: string }> = [];
  educationList: Array<{ _id?: string; degree: string; college: string; year: string }> = [];
  awardList: Array<any> = [];
  membershipList: Array<any> = [];
  socialList: Array<any> = [];
  socialTypes: Array<{ _id: string; name: string; logo?: string }> = [];

  // For editable/add rows in modals
  editedEducationList: Record<string, any> = {}; 
  newEducationList: Array<any> = [];
  newAwardList: Array<any> = [];
  newMemberList: Array<any> = [];
  newSocialList: Array<any> = [];
  
  // To track changes on existing items (Awards, Membership, Social)
  private editedAwards: Record<string, any> = {};
  private editedMemberships: Record<string, any> = {};
  private editedSocials: Record<string, any> = {};
  

  // dropdown / misc
  experinenceYear = Array.from({ length: 60 }, (_, i) => ({ label: `${i + 1} years`, value: `${i + 1}` }));
  years = ((): string[] => {
    const now = new Date().getFullYear();
    return Array.from({ length: 60 }, (_, i) => String(now - i));
  })();

  // side menu submenu toggle
  isSubmenuOpen = false;
  
  // ── phone/otp modal state ─────────────────────
  phoneForm!: FormGroup;
  otpForm!: FormGroup;
  phoneStep: 1 | 2 = 1;
  loading = false;
  resendCooldown = 0;
  resendTimerRef: any = null;
  serverError = '';
  serverInfo = '';
  pendingPhone = ''; // holds the phone being verified
  
  
  // ──────────────────────────────
  // LIFECYCLE
  // ──────────────────────────────
  currentUser:any;
  ngOnInit(): void {
    if (this.auth?.hasValidToken && !this.auth.hasValidToken()) {
      this.auth?.clearToken?.();
      this.router.navigate(['/auth/login']);
      return;
    }
    this.auth?.isLoggedIn$?.().pipe(takeUntil(this.destroy$)).subscribe((isLogged: boolean) => {
      if (!isLogged && !this.router.url.startsWith('/auth/login')) {
        this.router.navigate(['/auth/login']);
      }
    });
    window.addEventListener('storage', this.onStorageEvent);
    this.currentUser=this.crypto.decryptObj(localStorage.getItem('authUser'));

    this.initForm();
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('storage', this.onStorageEvent);
  }

  private onStorageEvent = (_ev: StorageEvent) => {
    const relevant = ['authToken', 'authUser', 'deviceId'];
    if (!_ev.key || relevant.includes(_ev.key)) {
      if (this.auth?.hasValidToken && !this.auth.hasValidToken()) {
        this.auth?.clearToken?.();
        if (!this.router.url.startsWith('/auth/login')) {
          this.router.navigate(['/auth/login']);
        }
      }
    }
  };

  // ──────────────────────────────
  // FORM
  // ──────────────────────────────
  private initForm() {
    this.profileForm = this.fb.group({
      fullName: ['', Validators.required],
      gender: ['1', Validators.required],
      specialization: [[], Validators.required],
      experience: ['', Validators.required],
      phone: [{ value: '', disabled: false }],
      email: ['', Validators.required],
      about: ['', Validators.required],
      profilePic: [''],
    });

    this.phoneForm = this.fb.group({
      phone: [
        '',
        [
          Validators.required,
          Validators.pattern(/^(\+?\d{1,3}[- ]?)?\d{10,14}$/),
        ],
      ],
    });

    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    });

  }
  get control() {
    return this.profileForm.controls;
  }

  // ──────────────────────────────
  // HTTP HELPERS
  // ──────────────────────────────
  private authHeaders(): HttpHeaders {
    const token =
      (typeof localStorage !== 'undefined' && this.crypto.decryptObj(localStorage.getItem('authToken'))) ||
      (this.auth as any)?.getToken?.();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  private get<T>(url: string) {
    return this.http.get<T>(url, { headers: this.authHeaders() });
  }
  
  private put(payload: any) {
    return this.http.put<any>(this.SETTINGS_URL, payload, { headers: this.authHeaders() });
  }

  // ──────────────────────────────
  // LOAD ALL API DATA
  // ──────────────────────────────
  private loadAll() {
    const profile$ = this.get<any>(`${this.BASE_URL}/setting/profile`);
    const edu$ = this.get<any>(`${this.BASE_URL}/setting/list?type=1`);
    const awards$ = this.get<any>(`${this.BASE_URL}/setting/list?type=2`);
    const members$ = this.get<any>(`${this.BASE_URL}/setting/list?type=4`);
    const socialList$ = this.get<any>(`${this.BASE_URL}/setting/list?type=8`);
    const socialTypes$ = this.get<any>(`${this.BASE_URL}/master/social-media`);
    const specialization$ = this.get<any>(`${this.BASE_URL}/master/specialization`);

    forkJoin({ profile$, edu$, awards$, members$, socialList$, socialTypes$, specialization$ })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ profile$, edu$, awards$, members$, socialList$, socialTypes$, specialization$ }) => {
          // Profile
          const profileObj = (profile$?.result ?? [])[0] ?? {};
          this.getFormValues = profileObj;
          this.isProfilePic = !!profileObj?.doctor?.profilePic;

          // Patch form
          const doc = profileObj?.doctor || {};
          this.profileForm.patchValue({
            fullName: profileObj?.fullName || '',
            gender: String(doc?.gender || '1'),
            specialization: doc?.specialization || [],
            experience: doc?.experience || '',
            phone: profileObj?.phone || '',
            email: doc?.email || '',
            about: doc?.about || '',
            profilePic: doc?.profilePic || '',
          });

          // Specializations
          this.specializationList = (specialization$?.result?.data || []).map((it: any) => ({
            _id: it._id,
            name: it.name,
          }));

          // Education
          this.educationList = (edu$?.result?.list || []).map((e: any) => ({
            _id: e._id,
            degree: e.degree,
            college: e.college,
            year: e.year,
          }));
          // build editable clone map
          this.editedEducationList = {};
          this.educationList.forEach((e) => (this.editedEducationList[e._id!] = { ...e }));

          // Awards
          this.awardList = (awards$?.result?.list || []).map((a: any) => ({ ...a }));

          // Memberships
          this.membershipList = (members$?.result?.list || []).map((m: any) => ({ ...m }));

          // Social master/types
          this.socialTypes = (socialTypes$?.result?.data || []).map((s: any) => ({
            _id: s._id,
            name: s.name,
          }));

          // Social list (already resolved names/logos)
          this.socialList = (socialList$?.result?.list || []).map((s: any) => ({
            _id: s._id,
            socialMediaId: s.socialMediaId,
            name: s.name,
            socialMediaLogo: s.socialMediaLogo,
            url: s.url,
          }));
        
        // Initialize edit maps for awards/memberships/socials for tracking changes to existing items
        this.awardList.forEach(a => this.editedAwards[a._id] = {...a});
        this.membershipList.forEach(m => this.editedMemberships[m._id] = {...m});
        this.socialList.forEach(s => this.editedSocials[s._id] = {...s});

        },
        error: (err) => {
          console.error('Failed to load profile data', err);
        },
      });
  }

  // ──────────────────────────────
  // TEMPLATE HELPERS (Fixing the NG9: Property does not exist errors)
  // ──────────────────────────────
  getSpecializationNames(ids: string[] = []): string {
    if (!ids?.length) return '';
    const map = new Map(this.specializationList.map((s) => [s._id, s.name]));
    return ids.map((id) => map.get(id) || '').filter(Boolean).join(', ');
  }

  getSocialMediaName(id?: string): string {
    if (!id) return '';
    // Check socialTypes for the name (preferred source)
    const byId = this.socialTypes.find((s) => s._id === id);
    if (byId) return byId.name;
    
    // Fallback to socialList name
    return this.socialList.find((s) => s.socialMediaId === id)?.name ?? '';
  }

  // Profile image helpers (Fixing the NG9: openFileInput does not exist error)
  openFileInput() {
    document.getElementById('profile-upload')?.click();
  }
  onFileUpload(ev: any) {
    const file = ev?.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.profileForm.patchValue({ profilePic: reader.result as string });
      this.isProfilePic = true;
    };
    reader.readAsDataURL(file);
  }

  // ──────────────────────────────
  // MENU & MODALS
  // ──────────────────────────────
  onMenuClick() {
    const side = document.getElementById('sideMenu');
    if (side) side.classList.add('open');
  }
  onCloseMenuClick() {
    const side = document.getElementById('sideMenu');
    if (side) side.classList.remove('open');
  }
  closeSideBar() {
    const side = document.getElementById('sideMenu');
    if (side) side.classList.remove('open');
  }
  settingtoggleSubmenu(e: Event) {
    e.preventDefault();
    this.isSubmenuOpen = !this.isSubmenuOpen;
  }

  openModal(id: string) {
    const el: any = document.getElementById(id);
    if (!el) return;
    // Simple Bootstrap 4/5 compatibility for showing modal
    const win = window as any;
    if (win.bootstrap?.Modal) {
      const modal = new win.bootstrap.Modal(el);
      modal.show();
    } else {
      el.classList.add('show');
      el.style.display = 'block';
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('role', 'dialog');
      el.removeAttribute('aria-hidden');
    }
  }
  closeModal(id: string) {
    const el: any = document.getElementById(id);
    if (!el) return;
    const win = window as any;
    // Simple Bootstrap 4/5 compatibility for hiding modal
    if (win.bootstrap?.Modal) {
      const modal = win.bootstrap.Modal.getInstance(el) || new win.bootstrap.Modal(el);
      modal.hide();
    } else {
      el.classList.remove('show');
      el.style.display = 'none';
      el.setAttribute('aria-hidden', 'true');
      el.removeAttribute('aria-modal');
      el.removeAttribute('role');
    }
  }


  // ──────────────────────────────
  // EDUCATION (modal)
  // ──────────────────────────────
  markEducationAsEdited(item: any) {
    // The two-way binding is sufficient; keep this method simple for consistency.
  }
  addMoreEducation() {
    this.newEducationList.push({ degree: '', college: '', year: '', degreeError: false, collegeError: false, yearError: false, _isNew: true });
  }
  deleteEducation(item: any) {
    // DELETE API call for existing item
    if (item._id) {
      const payload = {
        type: this.SETTING_TYPE.EDUCATION,
        isEdit: true, 
        records: { _id: item._id, isDelete: true },
      };
      this.put(payload).subscribe({
        next: () => {
          this.educationList = this.educationList.filter((e) => e._id !== item._id);
          delete this.editedEducationList[item._id];
        },
        error: (err) => console.error('Failed to delete education', err),
      });
    }
  }
  deleteNewEducation(idx: number) {
    this.newEducationList.splice(idx, 1);
  }
  
  saveEducation() {
    const isValidNew = this.newEducationList.every((x) => x.degree && x.college && x.year);
    
    if (!isValidNew) {
      this.newEducationList = this.newEducationList.map((x) => ({
        ...x,
        degreeError: !x.degree,
        collegeError: !x.college,
        yearError: !x.year,
      }));
      return;
    }

    const saveRequests: any[] = [];

    // 1. Handle Edited Existing Education
    for (const original of this.educationList) {
      const edited = this.editedEducationList[original._id!];
      if (
        edited &&
        (original.degree !== edited.degree || original.college !== edited.college || original.year !== edited.year)
      ) {
        const payload = {
          type: this.SETTING_TYPE.EDUCATION,
          isEdit: true,
          records: {
            _id: original._id, 
            degree: edited.degree,
            college: edited.college,
            year: edited.year,
          },
        };
        saveRequests.push(this.put(payload));
      }
    }

    // 2. Handle New Education
    for (const newItem of this.newEducationList) {
      const payload = {
        type: this.SETTING_TYPE.EDUCATION,
        isEdit: false,
        records: {
          degree: newItem.degree,
          college: newItem.college,
          year: newItem.year,
        },
      };
      saveRequests.push(this.put(payload));
    }

    if (saveRequests.length === 0) {
      this.closeModal('add_editucaiton_modal');
      return;
    }

    forkJoin(saveRequests).subscribe({
      next: () => {
        this.newEducationList = []; 
        this.closeModal('add_editucaiton_modal');
        this.loadAll(); // Reload to get fresh IDs/state
      },
      error: (err) => console.error('Failed to save education', err),
    });
  }

  // ──────────────────────────────
  // AWARDS (modal)
  // ──────────────────────────────
  markAwardAsEdited(item: any) {
    this.editedAwards[item._id] = { ...item };
  }
  addMoreAward() {
    this.newAwardList.push({ name: '', year: '', nameError: false, yearError: false, _isNew: true });
  }
  deleteAward(item: any) {
    if (item._id) {
      const payload = {
        type: this.SETTING_TYPE.AWARD,
        isEdit: true,
        records: { _id: item._id, isDelete: true },
      };
      this.put(payload).subscribe({
        next: () => {
          this.awardList = this.awardList.filter((a) => a._id !== item._id);
          delete this.editedAwards[item._id];
        },
        error: (err) => console.error('Failed to delete award', err),
      });
    }
  }
  deleteNewAward(idx: number) {
    this.newAwardList.splice(idx, 1);
  }
  saveAllAwards() {
    const isValidNew = this.newAwardList.every((x) => x.name && x.year);
    
    if (!isValidNew) {
      this.newAwardList = this.newAwardList.map((x) => ({
        ...x,
        nameError: !x.name,
        yearError: !x.year,
      }));
      return;
    }
    
    const saveRequests: any[] = [];
    
    // 1. Handle Edited Existing Awards
    this.awardList.forEach(item => {
      if (item._id && this.editedAwards[item._id]) {
        const payload = {
          type: this.SETTING_TYPE.AWARD,
          isEdit: true,
          records: {
            _id: item._id,
            name: item.name,
            year: item.year,
          },
        };
        saveRequests.push(this.put(payload));
      }
    });

    // 2. Handle New Awards
    for (const newItem of this.newAwardList) {
      const payload = {
        type: this.SETTING_TYPE.AWARD,
        isEdit: false,
        records: {
          name: newItem.name,
          year: newItem.year,
        },
      };
      saveRequests.push(this.put(payload));
    }

    if (saveRequests.length === 0) {
      this.closeModal('awards_recognitions_modal');
      return;
    }

    forkJoin(saveRequests).subscribe({
      next: () => {
        this.newAwardList = []; 
        this.closeModal('awards_recognitions_modal');
        this.loadAll(); 
      },
      error: (err) => console.error('Failed to save awards', err),
    });
  }


  // ──────────────────────────────
  // MEMBERSHIP (modal)
  // ──────────────────────────────
  markMemberAsEdited(item: any) {
    this.editedMemberships[item._id] = { ...item };
  }
  addMoreMember() {
    this.newMemberList.push({ name: '', nameError: false, _isNew: true });
  }
  deleteMembership(item: any) {
    if (item._id) {
      const payload = {
        type: this.SETTING_TYPE.MEMBERSHIP,
        isEdit: true,
        records: { _id: item._id, isDelete: true },
      };
      this.put(payload).subscribe({
        next: () => {
          this.membershipList = this.membershipList.filter((m) => m._id !== item._id);
          delete this.editedMemberships[item._id];
        },
        error: (err) => console.error('Failed to delete membership', err),
      });
    }
  }
  deleteNewMember(idx: number) {
    this.newMemberList.splice(idx, 1);
  }
  saveAllMember() {
    const isValidNew = this.newMemberList.every((x) => x.name);
    
    if (!isValidNew) {
      this.newMemberList = this.newMemberList.map((x) => ({ ...x, nameError: !x.name }));
      return;
    }
    
    const saveRequests: any[] = [];
    
    // 1. Handle Edited Existing Memberships
    this.membershipList.forEach(item => {
      if (item._id && this.editedMemberships[item._id]) {
        const payload = {
          type: this.SETTING_TYPE.MEMBERSHIP,
          isEdit: true,
          records: {
            _id: item._id,
            name: item.name,
          },
        };
        saveRequests.push(this.put(payload));
      }
    });

    // 2. Handle New Memberships
    for (const newItem of this.newMemberList) {
      const payload = {
        type: this.SETTING_TYPE.MEMBERSHIP,
        isEdit: false,
        records: {
          name: newItem.name,
        },
      };
      saveRequests.push(this.put(payload));
    }

    if (saveRequests.length === 0) {
      this.closeModal('membership_modal');
      return;
    }

    forkJoin(saveRequests).subscribe({
      next: () => {
        this.newMemberList = []; 
        this.closeModal('membership_modal');
        this.loadAll(); 
      },
      error: (err) => console.error('Failed to save membership', err),
    });
  }


  // ──────────────────────────────
  // SOCIAL (modal)
  // ──────────────────────────────
  selectSocialMedia(item: any, type: any) {
    item.socialMediaId = type._id;
    item.name = type.name;
    item.socialMediaIdError = false;
    // Mark existing social as edited when ID changes
    if (item._id) {
      this.editedSocials[item._id] = { ...item };
    }
  }
  selectNewSocialMedia(item: any, type: any) {
    item.socialMediaId = type._id;
    item.name = type.name;
    item.socialMediaIdError = false;
  }
  
  markSocialAsEdited(item: any) {
    if (item._id) {
      this.editedSocials[item._id] = { ...item };
    }
  }
  
  addMoreSocial() {
    this.newSocialList.push({ socialMediaId: '', url: '', socialMediaIdError: false, urlError: false, _isNew: true });
  }
  deleteSocail(item: any) {
    if (item._id) {
      const payload = {
        type: this.SETTING_TYPE.SOCIAL,
        isEdit: true,
        records: { _id: item._id, isDelete: true },
      };
      this.put(payload).subscribe({
        next: () => {
          this.socialList = this.socialList.filter((s) => s._id !== item._id);
          delete this.editedSocials[item._id];
        },
        error: (err) => console.error('Failed to delete social', err),
      });
    }
  }
  deleteNewSocial(idx: number) {
    this.newSocialList.splice(idx, 1);
  }
  saveAllSocial() {
    const isValidNew = this.newSocialList.every((x) => x.socialMediaId && x.url);
    
    if (!isValidNew) {
      this.newSocialList = this.newSocialList.map((x) => ({
        ...x,
        socialMediaIdError: !x.socialMediaId,
        urlError: !x.url,
      }));
      return;
    }
    
    const saveRequests: any[] = [];
    
    // 1. Handle Edited Existing Socials
    this.socialList.forEach(item => {
      if (item._id && this.editedSocials[item._id]) {
        const payload = {
          type: this.SETTING_TYPE.SOCIAL,
          isEdit: true,
          records: {
            _id: item._id,
            socialMediaId: item.socialMediaId,
            url: item.url,
          },
        };
        saveRequests.push(this.put(payload));
      }
    });

    // 2. Handle New Socials
    for (const newItem of this.newSocialList) {
      const payload = {
        type: this.SETTING_TYPE.SOCIAL,
        isEdit: false,
        records: {
          socialMediaId: newItem.socialMediaId,
          url: newItem.url,
        },
      };
      saveRequests.push(this.put(payload));
    }

    if (saveRequests.length === 0) {
      this.closeModal('social_websites_modal');
      return;
    }

    forkJoin(saveRequests).subscribe({
      next: () => {
        this.newSocialList = []; 
        this.closeModal('social_websites_modal');
        this.loadAll(); 
      },
      error: (err) => console.error('Failed to save social media/websites', err),
    });
  }
  
  // ──────────────────────────────
  // SHARED VALIDATION
  // ──────────────────────────────
  onFieldChange(field: 'degree' | 'college' | 'year' | 'awardName' | 'membershipName' | 'socialLink', obj: any) {
    const map: any = {
      degree: 'degreeError',
      college: 'collegeError',
      year: 'yearError',
      awardName: 'nameError',
      membershipName: 'nameError',
      socialLink: 'urlError',
    };
    
    // Update validation for new items
    if (obj && map[field] in obj) {
      const propToValidate = (field === 'awardName' || field === 'membershipName') ? 'name' : (field === 'socialLink' ? 'url' : field);
      obj[map[field]] = !obj[propToValidate];
    }
    
    // If it's an existing item being edited, ensure we mark it for PUT.
    if (obj && obj._id) {
      if (field === 'awardName') {
        this.markAwardAsEdited(obj);
      } else if (field === 'membershipName') {
        this.markMemberAsEdited(obj);
      } else if (field === 'socialLink') {
        // Note: for social links, the template is updated to use markSocialAsEdited directly on (change)
        // This ensures we catch changes from the input field.
        this.markSocialAsEdited(obj);
      }
    }
  }


  // ──────────────────────────────
  // TOP ACTIONS
  // ──────────────────────────────
  submitForm() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    // Ideally, you would call a profile update API here
    
    const v = this.profileForm.getRawValue();
    this.getFormValues = {
      ...(this.getFormValues || {}),
      fullName: v.fullName,
      phone: v.phone,
      doctor: {
        ...(this.getFormValues?.doctor || {}),
        gender: Number(v.gender),
        specialization: v.specialization,
        experience: v.experience,
        email: v.email,
        about: v.about,
        profilePic: v.profilePic,
      },
    };
    this.isProfilePic = !!v.profilePic;
    this.closeModal('edit_profile_modal');
  }

  finish() {
    console.log('Finish clicked');
    // this.router.navigate(['/doctor/dashboard']);
  }

// ── phone/otp modal state ─────────────────────

openPhoneModal() {
  this.resetPhoneModal();
  const current = this.profileForm.get('phone')?.value || this.getFormValues?.phone || '';
  this.phoneForm.patchValue({ phone: current });
  this.openModal('edit_phone_modal');
}

closePhoneModal() {
  this.clearResendTimer();
  this.closeModal('edit_phone_modal');
}

requestOtp() {
  if (this.phoneForm.invalid) {
    this.phoneForm.markAllAsTouched();
    return;
  }
  this.loading = true;
  this.serverError = '';
  this.serverInfo = '';

  const phone = (this.phoneForm.value.phone || '').trim();
  const body = { phone,countryCode:"+91",userType:2 };

  this.http
    .post<any>(`${this.BASE_URL}/registration/changePhone`, body, { headers: this.authHeaders() })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (res) => {
        this.loading = false;
        this.pendingPhone = phone;
        this.phoneStep = 2;
        this.serverInfo = res?.message || 'OTP sent to your phone.';
      },
      error: (err) => {
        this.loading = false;
        this.serverError = err?.error?.message || 'Failed to send OTP. Please try again.';
      },
    });
}


verifyOtp() {
  if (this.otpForm.invalid) {
    this.otpForm.markAllAsTouched();
    return;
  }
  this.loading = true;
  this.serverError = '';
  this.serverInfo = '';

  const payload = {
    phone: this.pendingPhone,
    userId:this.currentUser._id,
    otp: this.otpForm.value.otp,
    userType:2,

  };

  this.http
    .post<any>(`${this.BASE_URL}/registration/changePhoneVerify`, payload, { headers: this.authHeaders() })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (res) => {
        this.loading = false;
        this.profileForm.patchValue({ phone: this.pendingPhone });
        this.getFormValues = { ...(this.getFormValues || {}), phone: this.pendingPhone };

        this.serverInfo = res?.message || 'Phone verified successfully.';
        this.closePhoneModal();
      },
      error: (err) => {
        this.loading = false;
        this.serverError = err?.error?.message || 'Invalid OTP. Please try again.';
      },
    });
}


resendOtp() {
  if (!this.pendingPhone || this.resendCooldown > 0) return;

  this.loading = true;
  this.serverError = '';
  this.serverInfo = '';

  const body = { phone: this.pendingPhone,countryCode:"+91",userType:2, userId:this.currentUser._id };

  this.http
    .post<any>(`${this.BASE_URL}registration/changePhone`, body, { headers: this.authHeaders() })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (res) => {
        this.loading = false;
        this.startResendTimer(30);
        this.serverInfo = res?.message || 'OTP resent.';
      },
      error: (err) => {
        this.loading = false;
        this.serverError = err?.error?.message || 'Could not resend OTP.';
      },
    });
}

private startResendTimer(seconds = 30) {
  this.resendCooldown = seconds;
  this.clearResendTimer();
  this.resendTimerRef = setInterval(() => {
    this.resendCooldown--;
    if (this.resendCooldown <= 0) this.clearResendTimer();
  }, 1000);
}

private clearResendTimer() {
  if (this.resendTimerRef) {
    clearInterval(this.resendTimerRef);
    this.resendTimerRef = null;
  }
}

private resetPhoneModal() {
  this.phoneStep = 1;
  this.loading = false;
  this.resendCooldown = 0;
  this.serverError = '';
  this.serverInfo = '';
  this.pendingPhone = '';
  this.phoneForm.reset({ phone: '' });
  this.otpForm.reset({ otp: '' });
}
}
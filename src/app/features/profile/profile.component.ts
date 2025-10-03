import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { CryptoProvider } from '../../core/services/crypto.service';   // <-- assumes you have this

// If you already have AuthService in your app, you can keep it injected;
// otherwise this comp works without it (it will call the APIs without auth headers).
class AuthServiceLike {
  hasValidToken?: () => boolean;
  clearToken?: () => void;
  isLoggedIn$?: () => any;
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
  private BASE_URL = 'http://localhost:8080/api/v1';

  // Optional: if you have AuthService in your app, Angular DI will provide it;
  // otherwise it’s fine (it’s typed as "AuthServiceLike" so code compiles).
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

  // dropdown / misc
  experinenceYear = Array.from({ length: 60 }, (_, i) => ({ label: `${i + 1} years`, value: `${i + 1}` }));
  years = ((): string[] => {
    const now = new Date().getFullYear();
    return Array.from({ length: 60 }, (_, i) => String(now - i));
  })();

  // side menu submenu toggle
  isSubmenuOpen = false;
  
  



  // ──────────────────────────────
  // LIFECYCLE
  // ──────────────────────────────
  currentUser:any;
  ngOnInit(): void {
    // Optional auth guards if you have an AuthService
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

    // inside initForm() AFTER your profile form, or in ngOnInit() after calling initForm()
    this.phoneForm = this.fb.group({
      phone: [
        '',
        [
          Validators.required,
          Validators.pattern(/^(\+?\d{1,3}[- ]?)?\d{10,14}$/), // tweak to your needs
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
            // we don't get a logo here; logos are present in type=8 payload per-entry if needed
          }));

          // Social list (already resolved names/logos)
          this.socialList = (socialList$?.result?.list || []).map((s: any) => ({
            _id: s._id,
            socialMediaId: s.socialMediaId,
            name: s.name,
            socialMediaLogo: s.socialMediaLogo,
            url: s.url,
          }));
        },
        error: (err) => {
          console.error('Failed to load profile data', err);
        },
      });
  }

  // ──────────────────────────────
  // TEMPLATE HELPERS
  // ──────────────────────────────
  getSpecializationNames(ids: string[] = []): string {
    if (!ids?.length) return '';
    const map = new Map(this.specializationList.map((s) => [s._id, s.name]));
    return ids.map((id) => map.get(id) || '').filter(Boolean).join(', ');
  }

  getSocialMediaName(id?: string): string {
    if (!id) return '';
    const byId = this.socialTypes.find((s) => s._id === id);
    return byId?.name || (this.socialList.find((s) => s.socialMediaId === id)?.name ?? '');
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
    // Bootstrap 5 support if available on page:
    const win = window as any;
    if (win.bootstrap?.Modal) {
      const modal = new win.bootstrap.Modal(el);
      modal.show();
    } else {
      el.classList.add('show');
      el.style.display = 'block';
      el.removeAttribute('aria-hidden');
    }
  }
  closeModal(id: string) {
    const el: any = document.getElementById(id);
    if (!el) return;
    const win = window as any;
    if (win.bootstrap?.Modal) {
      const modal = win.bootstrap.Modal.getInstance(el) || new win.bootstrap.Modal(el);
      modal.hide();
    } else {
      el.classList.remove('show');
      el.style.display = 'none';
      el.setAttribute('aria-hidden', 'true');
    }
  }

  // Profile image
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
  // EDUCATION (modal)
  // ──────────────────────────────
  markEducationAsEdited(item: any) {
    if (!item?._id) return;
    this.editedEducationList[item._id] = { ...item };
  }
  addMoreEducation() {
    this.newEducationList.push({ degree: '', college: '', year: '', degreeError: false, collegeError: false, yearError: false });
  }
  deleteEducation(item: any) {
    this.educationList = this.educationList.filter((e) => e._id !== item._id);
    delete this.editedEducationList[item._id];
  }
  deleteNewEducation(idx: number) {
    this.newEducationList.splice(idx, 1);
  }
  onFieldChange(field: 'degree' | 'college' | 'year' | 'awardName' | 'membershipName' | 'socialLink', obj: any) {
    const map: any = {
      degree: 'degreeError',
      college: 'collegeError',
      year: 'yearError',
      awardName: 'nameError',
      membershipName: 'nameError',
      socialLink: 'urlError',
    };
    if (obj && map[field] in obj) obj[map[field]] = !obj[field === 'awardName' ? 'name' : field];
  }
  saveEducation() {
    // Here you’d POST/PUT to your save endpoint.
    // For now we just merge the new list into main list.
    const valid = this.newEducationList.every((x) => x.degree && x.college && x.year);
    if (!valid) {
      this.newEducationList = this.newEducationList.map((x) => ({
        ...x,
        degreeError: !x.degree,
        collegeError: !x.college,
        yearError: !x.year,
      }));
      return;
    }
    this.educationList = [...this.educationList, ...this.newEducationList.map(({ degree, college, year }) => ({ degree, college, year }))];
    this.newEducationList = [];
    this.closeModal('add_editucaiton_modal');
  }

  // ──────────────────────────────
  // AWARDS (modal)
  // ──────────────────────────────
  markAwardAsEdited(item: any) {
    item._edited = true;
  }
  addMoreAward() {
    this.newAwardList.push({ name: '', year: '', nameError: false, yearError: false });
  }
  deleteAward(item: any) {
    this.awardList = this.awardList.filter((a) => a._id !== item._id);
  }
  deleteNewAward(idx: number) {
    this.newAwardList.splice(idx, 1);
  }
  saveAllAwards() {
    const valid = this.newAwardList.every((x) => x.name && x.year);
    if (!valid) {
      this.newAwardList = this.newAwardList.map((x) => ({
        ...x,
        nameError: !x.name,
        yearError: !x.year,
      }));
      return;
    }
    this.awardList = [...this.awardList, ...this.newAwardList.map(({ name, year }) => ({ name, year }))];
    this.newAwardList = [];
    this.closeModal('awards_recognitions_modal');
  }

  // ──────────────────────────────
  // MEMBERSHIP (modal)
  // ──────────────────────────────
  markMemberAsEdited(item: any) {
    item._edited = true;
  }
  addMoreMember() {
    this.newMemberList.push({ name: '', nameError: false });
  }
  deleteMembership(item: any) {
    this.membershipList = this.membershipList.filter((m) => m._id !== item._id);
  }
  deleteNewMember(idx: number) {
    this.newMemberList.splice(idx, 1);
  }
  saveAllMember() {
    const valid = this.newMemberList.every((x) => x.name);
    if (!valid) {
      this.newMemberList = this.newMemberList.map((x) => ({ ...x, nameError: !x.name }));
      return;
    }
    this.membershipList = [...this.membershipList, ...this.newMemberList.map(({ name }) => ({ name }))];
    this.newMemberList = [];
    this.closeModal('membership_modal');
  }

  // ──────────────────────────────
  // SOCIAL (modal)
  // ──────────────────────────────
  selectSocialMedia(item: any, type: any) {
    item.socialMediaId = type._id;
    item.name = type.name;
    item.socialMediaIdError = false;
  }
  selectNewSocialMedia(item: any, type: any) {
    item.socialMediaId = type._id;
    item.name = type.name;
    item.socialMediaIdError = false;
  }
  addMoreSocial() {
    this.newSocialList.push({ socialMediaId: '', url: '', socialMediaIdError: false, urlError: false });
  }
  deleteSocail(item: any) {
    this.socialList = this.socialList.filter((s) => s._id !== item._id);
  }
  deleteNewSocial(idx: number) {
    this.newSocialList.splice(idx, 1);
  }
  saveAllSocial() {
    const valid = this.newSocialList.every((x) => x.socialMediaId && x.url);
    if (!valid) {
      this.newSocialList = this.newSocialList.map((x) => ({
        ...x,
        socialMediaIdError: !x.socialMediaId,
        urlError: !x.url,
      }));
      return;
    }
    this.socialList = [
      ...this.socialList,
      ...this.newSocialList.map(({ socialMediaId, url, name }) => ({ socialMediaId, url, name })),
    ];
    this.newSocialList = [];
    this.closeModal('social_websites_modal');
  }

  // ──────────────────────────────
  // TOP ACTIONS
  // ──────────────────────────────
  submitForm() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    // Here you’d hit your PUT/PATCH endpoint to save profile.
    // For now we update the display model and close the modal.
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
    // Navigate or do any final action
    // this.router.navigate(['/doctor/dashboard']);
    console.log('Finish clicked');
  }

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


openPhoneModal() {
  this.resetPhoneModal();
  // prefill with current phone
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
  // const body = { phone }; // adjust to your backend contract
    const body = { phone,countryCode:"+91",userType:2 };

  this.http
    .post<any>(`${this.BASE_URL}/registration/changePhone`, body, { headers: this.authHeaders() })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (res) => {
        this.loading = false;
        this.pendingPhone = phone;
        this.phoneStep = 2;
        // this.startResendTimer(30);
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

  
// https://api.nectarplus.health/api/v1/registration/changePhoneVerify

  this.http
    .post<any>(`${this.BASE_URL}/registration/changePhoneVerify`, payload, { headers: this.authHeaders() })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (res) => {
        this.loading = false;
        // Optionally hit your profile update endpoint instead
        // If verify already persists, just patch local state:
        this.profileForm.patchValue({ phone: this.pendingPhone });
        this.getFormValues = { ...(this.getFormValues || {}), phone: this.pendingPhone };

        this.serverInfo = res?.message || 'Phone verified successfully.';
        // close and clear modal
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
    // http://localhost:8080/api/v1/registration/changePhone

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

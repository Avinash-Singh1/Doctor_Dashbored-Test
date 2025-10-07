// src/app/features/faq/faq.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service'; // adjust if needed
import { CryptoProvider } from '../../core/services/crypto.service';   // <-- assumes you have this

type ApiFaqItem = {
  _id: string;
  question: string;
  answer: string;
  userType: number;
  isDeleted: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

type ListApiResponse = {
  success: boolean;
  status_code: number;
  message: string;
  result: { count: number; data: ApiFaqItem[] };
  time: number;
};

type AddApiResponse = {
  success: boolean;
  status_code: number;
  message: string;
  result: ApiFaqItem;
  time: number;
};

type FaqItem = {
  id?: string;
  question: string;
  answer: string;
};

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss'],
})
export class FaqComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // UI state
  loading = false;
  loadError: string | null = null;
  saving = false;
  saveError: string | null = null;

  // Data
  faqsList: FaqItem[] = [];
  selectedFaq: FaqItem | null = null;

  // Config
  private readonly TOKEN_KEY = 'authToken'; // match whatever you actually store under
  private readonly userType = 2;

  // If you don't have it in AuthService, this is a safe fallback.
  private readonly fallbackUserId = '65716d561eece2ff479fba0b';


authUser:any;
currentUser:any
  constructor(
    private router: Router,
    private auth: AuthService,
    private http: HttpClient,
    private crypto: CryptoProvider
  ) {
  this.authUser = localStorage.getItem('authUser');

  this.currentUser = this.crypto.decryptObj(this.authUser);
  this.currentUser? console.log("currentUser: ",this.currentUser):console.log("Not userfound");
  }




  ngOnInit(): void {
    // 1) Immediate synchronous check
    if (!this.auth.hasValidToken()) {
      if (typeof this.auth.clearToken === 'function') this.auth.clearToken();
      this.router.navigate(['/auth/login']);
      return;
    }

    // 2) Subscribe to login state
    this.auth.isLoggedIn$().pipe(takeUntil(this.destroy$)).subscribe((isLogged) => {
      if (!isLogged && !this.router.url.startsWith('/auth/login')) {
        this.router.navigate(['/auth/login']);
      }
    });

    // 3) Cross-tab
    window.addEventListener('storage', this.onStorageEvent);

    // 4) Initial load
    this.loadFaqs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('storage', this.onStorageEvent);
  }

  private onStorageEvent = (ev: StorageEvent) => {
    const relevantKeys = ['authToken', 'authUser', 'deviceId'];
    if (ev.key === null || relevantKeys.includes(ev.key)) {
      if (!this.auth.hasValidToken()) {
        if (typeof this.auth.clearToken === 'function') this.auth.clearToken();
        if (!this.router.url.startsWith('/auth/login')) this.router.navigate(['/auth/login']);
      }
    }
  };

  /** Fetch list */
  private loadFaqs(): void {
    this.loading = true;
    this.loadError = null;

    const userId =
      (this as any).auth?.currentUser?.id ||
      (this as any).auth?.user?.id ||
      // this.fallbackUserId;
      this.currentUser.doctorId;

    const url = `http://82.112.237.181:8080/api/v1/faq/all-faq?id=${encodeURIComponent(
      userId
    )}&userType=${this.userType}`;

    this.http
      .get<ListApiResponse>(url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const rows = res?.result?.data ?? [];
          this.faqsList = rows.map((r) => ({
            id: r._id,
            question: (r.question ?? '').trim(),
            answer: (r.answer ?? '').trim(),
          }));
          this.loading = false;
        },
        error: (err) => {
          this.loadError =
            err?.error?.message ?? err?.message ?? 'Failed to load FAQs. Please try again.';
          this.loading = false;
          if (this.faqsList.length === 0) this.faqsList = [];
        },
      });
  }

  /** Modal helpers */
  openModal(id: string) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('show', 'd-block');
  }

  closeModal(id: string) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('show', 'd-block');
  }

  /** UI events */
  onAddFaqs() {
    this.saveError = null;
    this.openModal('addFaqModal');
  }

  onEditFaqs(faq: FaqItem) {
    this.selectedFaq = { ...faq };
    this.openModal('editFaqModal');
  }

  /** POST /api/v1/faq on Save */
  handleAddFaq(question: string, answer: string) {
    const q = (question || '').trim();
    const a = (answer || '').trim();
    if (!q || !a) {
      this.saveError = 'Question and answer are required.';
      return;
    }

    this.saving = true;
    this.saveError = null;

    // Resolve userId from auth or fallback
    const userId =
      (this as any).auth?.currentUser?.id ||
      (this as any).auth?.user?.id ||
      this.currentUser.doctorId
      // this.fallbackUserId;

    const payload = {
      question: q,
      answer: a,
      userType: this.userType,
      userId: userId, // required by your API
    };

    // Build headers with decrypted token, if present
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    try {
      const enc = localStorage.getItem(this.TOKEN_KEY);
      if (enc) {
        const token = this.crypto.decryptObj(enc);
        if (token) {
          // If your backend expects a different header, adjust here
          headers = headers.set('Authorization', `Bearer ${token}`);
        }
      }
    } catch (e) {
      // If decryption fails, proceed without header; your interceptor may add it anyway
    }

    const url = 'http://82.112.237.181:8080/api/v1/faq';

    this.http
      .post<AddApiResponse>(url, payload, { headers })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const r = res?.result;
          if (r) {
            // Optimistically add the new item at the top
            const newItem: FaqItem = {
              id: r._id,
              question: (r.question ?? '').trim(),
              answer: (r.answer ?? '').trim(),
            };
            this.faqsList = [newItem, ...this.faqsList];
          }
          this.saving = false;
          this.closeModal('addFaqModal');

          // Optional: refresh from server to stay in sync
          // this.loadFaqs();
        },
        error: (err) => {
          this.saving = false;
          this.saveError =
            err?.error?.message ?? err?.message ?? 'Failed to add FAQ. Please try again.';
        },
      });
  }

  handleEditFaq(question: string, answer: string) {
    if (this.selectedFaq) {
      const idx = this.faqsList.findIndex(
        (f) =>
          f.id === this.selectedFaq!.id ||
          (f.question === (this.selectedFaq as any).question &&
            f.answer === (this.selectedFaq as any).answer)
      );
      if (idx !== -1) {
        const updated = { ...this.faqsList[idx], question, answer };
        const copy = [...this.faqsList];
        copy[idx] = updated;
        this.faqsList = copy;
      }
      this.selectedFaq = null;
    }
    this.closeModal('editFaqModal');
  }

  // onDeleteFaqs() {
  //   if (!this.selectedFaq) return;
  //   this.faqsList = this.faqsList.filter(
  //     (f) => f !== this.selectedFaq && f.id !== this.selectedFaq?.id
  //   );
  //   this.closeModal('editFaqModal');
  // }

  onDeleteFaqs() {
  if (!this.selectedFaq || !this.selectedFaq.id) return;

  const faqId = this.selectedFaq.id;
  const url = `http://82.112.237.181:8080/api/v1/faq/${faqId}`;

  let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
  try {
    const enc = localStorage.getItem(this.TOKEN_KEY);
    if (enc) {
      const token = this.crypto.decryptObj(enc);
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }
  } catch (e) {
    console.warn('Failed to decrypt token, continuing without headers');
  }

  this.http
    .delete<{ success: boolean; message: string }>(url, { headers })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (res) => {
        // If backend confirms delete
        this.faqsList = this.faqsList.filter((f) => f.id !== faqId);
        this.closeModal('editFaqModal');
        this.selectedFaq = null;
      },
      error: (err) => {
        console.error('Failed to delete FAQ:', err);
        alert(
          err?.error?.message ??
            err?.message ??
            'Failed to delete FAQ. Please try again.'
        );
      },
    });
}


  refresh() {
    this.loadFaqs();
  }

  trackById = (_: number, item: FaqItem) => item.id ?? `${item.question}-${item.answer}`;
}

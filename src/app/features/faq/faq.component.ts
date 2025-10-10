// src/app/features/faq/faq.component.ts
import { Component, OnInit, OnDestroy, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { HttpClientModule } from '@angular/common/http';

import { AuthService } from '../../core/services/auth.service';
import { CryptoProvider } from '../../core/services/crypto.service';
import { FaqService, FaqItem } from '../../core/services/faq.service';

// --- Mockup Toastr Service (for centralized error messaging) ---
@Injectable({ providedIn: 'root' })
class ToastrServiceMock {
  success(message: string): void { console.log('SUCCESS:', message); }
  error(message: string): void { console.error('ERROR:', message); }
}

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss'],
  providers: [FaqService, ToastrServiceMock] // Provide the service
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

  // Configuration (Removed redundant API constants and user logic)
  // currentUser is handled by the service's constructor, but kept here for local component context if needed
  currentUser: any; 

  constructor(
    private router: Router,
    private auth: AuthService,
    private faqService: FaqService, // Use the new service
    private crypto: CryptoProvider,
    private toastr: ToastrServiceMock // Use toastr for user feedback
  ) {
    // Keep user decoding here for immediate component use (like auth check)
    const rawAuthUser = localStorage.getItem('authUser');
    this.currentUser = rawAuthUser ? this.crypto.decryptObj(rawAuthUser) : null;
    this.currentUser ? console.log("currentUser: ", this.currentUser) : console.log("Not userfound");
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

  /** Fetch list (via Service) */
  public loadFaqs(): void {
    this.loading = true;
    this.loadError = null;

    this.faqService.getFaqs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => {
          this.faqsList = rows;
          this.loading = false;
        },
        error: (err) => {
          const message = err?.error?.message ?? err?.message ?? 'Failed to load FAQs. Please try again.';
          this.loadError = message;
          this.toastr.error(message);
          this.loading = false;
          if (this.faqsList.length === 0) this.faqsList = [];
        },
      });
  }

  /** Modal helpers (unchanged) */
  openModal(id: string) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('show', 'd-block');
  }

  closeModal(id: string) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('show', 'd-block');
  }

  /** UI events (unchanged) */
  onAddFaqs() {
    this.saveError = null;
    this.openModal('addFaqModal');
  }

  onEditFaqs(faq: FaqItem) {
    this.selectedFaq = { ...faq };
    this.openModal('editFaqModal');
  }

  /** POST /api/v1/faq on Save (via Service) */
  handleAddFaq(question: string, answer: string) {
    const q = (question || '').trim();
    const a = (answer || '').trim();
    if (!q || !a) {
      this.saveError = 'Question and answer are required.';
      this.toastr.error('Question and answer are required.');
      return;
    }

    this.saving = true;
    this.saveError = null;

    this.faqService.addFaq(q, a)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newItem) => {
          this.faqsList = [newItem, ...this.faqsList];
          this.toastr.success('FAQ added successfully.');
          this.saving = false;
          this.closeModal('addFaqModal');
        },
        error: (err) => {
          this.saving = false;
          const message = err?.error?.message ?? err?.message ?? 'Failed to add FAQ. Please try again.';
          this.saveError = message;
          this.toastr.error(message);
        },
      });
  }

  /** PUT /api/v1/faq/id on Save Edit (Refactored to use Service) */
  handleEditFaq(question: string, answer: string) {
    if (!this.selectedFaq?.id) {
      this.closeModal('editFaqModal');
      return;
    }

    const updatedFaq: FaqItem = {
      id: this.selectedFaq.id,
      question: (question || '').trim(),
      answer: (answer || '').trim(),
    };
    
    // NOTE: The original component did a local update and no API call.
    // We update the local list optimistically and call the service for completeness.
    
    // 1. Optimistic Local Update
    this.faqsList = this.faqsList.map(f => f.id === updatedFaq.id ? updatedFaq : f);

    // 2. Call API to persist changes
    this.faqService.updateFaq(updatedFaq)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
            next: () => {
                this.toastr.success('FAQ updated successfully.');
            },
            error: (err) => {
                const message = err?.error?.message ?? 'Failed to update FAQ.';
                this.toastr.error(message);
                // 3. Re-fetch or revert on error if necessary
                this.loadFaqs(); 
            }
        });

    this.selectedFaq = null;
    this.closeModal('editFaqModal');
  }

  /** DELETE /api/v1/faq/id (via Service) */
  onDeleteFaqs() {
    if (!this.selectedFaq || !this.selectedFaq.id) return;

    const faqId = this.selectedFaq.id;

    this.faqService.deleteFaq(faqId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.faqsList = this.faqsList.filter((f) => f.id !== faqId);
          this.toastr.success('FAQ deleted successfully.');
          this.closeModal('editFaqModal');
          this.selectedFaq = null;
        },
        error: (err) => {
          const message = err?.error?.message ?? err?.message ?? 'Failed to delete FAQ. Please try again.';
          this.toastr.error(message);
          console.error('Failed to delete FAQ:', err);
        },
      });
  }

  refresh() {
    this.loadFaqs();
  }

  trackById = (_: number, item: FaqItem) => item.id ?? `${item.question}-${item.answer}`;
}
// src/app/features/faq/faq.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../core/services/auth.service'; // <-- adjust path

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss'],
})
export class FaqComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  faqsList = [
    { question: 'What is Angular?', answer: 'Angular is a TypeScript-based framework for building applications.' },
    { question: 'How do I install Angular CLI?', answer: 'Run `npm install -g @angular/cli` in your terminal.' },
    { question: 'Is Angular better than React?', answer: 'It depends on your project needs. Angular is a full framework, React is a library.' },
  ];

  selectedFaq: any = null;

  constructor(private router: Router, private auth: AuthService) {}

  ngOnInit(): void {
    // 1) Immediate synchronous check
    if (!this.auth.hasValidToken()) {
      if (typeof this.auth.clearToken === 'function') {
        this.auth.clearToken();
      }
      this.router.navigate(['/auth/login']);
      return;
    }

    // 2) Subscribe to login state
    this.auth.isLoggedIn$().pipe(takeUntil(this.destroy$)).subscribe((isLogged) => {
      if (!isLogged && !this.router.url.startsWith('/auth/login')) {
        this.router.navigate(['/auth/login']);
      }
    });

    // 3) Listen for cross-tab storage events
    window.addEventListener('storage', this.onStorageEvent);
  }

  private onStorageEvent = (ev: StorageEvent) => {
    const relevantKeys = ['authToken', 'authUser', 'deviceId'];
    if (ev.key === null || relevantKeys.includes(ev.key)) {
      if (!this.auth.hasValidToken()) {
        if (typeof this.auth.clearToken === 'function') {
          this.auth.clearToken();
        }
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

  /** Modal helpers */
  openModal(id: string) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('show', 'd-block');
    }
  }

  closeModal(id: string) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('show', 'd-block');
    }
  }

  /** FAQ actions */
  onAddFaqs() {
    this.openModal('addFaqModal');
  }

  onEditFaqs(faq: any) {
    this.selectedFaq = { ...faq };
    this.openModal('editFaqModal');
  }

  handleAddFaq(question: string, answer: string) {
    if (question.trim() && answer.trim()) {
      this.faqsList.push({ question, answer });
    }
    this.closeModal('addFaqModal');
  }

  handleEditFaq(question: string, answer: string) {
    if (this.selectedFaq) {
      const index = this.faqsList.findIndex(
        f => f.question === this.selectedFaq.question && f.answer === this.selectedFaq.answer
      );
      if (index !== -1) {
        this.faqsList[index] = { question, answer };
      }
      this.selectedFaq = null;
    }
    this.closeModal('editFaqModal');
  }

  onDeleteFaqs() {
    this.faqsList = this.faqsList.filter(f => f !== this.selectedFaq);
    this.closeModal('editFaqModal');
  }
}

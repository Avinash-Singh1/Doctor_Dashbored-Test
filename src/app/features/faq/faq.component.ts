import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.scss',
})
export class FaqComponent {
  faqsList = [
    { question: 'What is Angular?', answer: 'Angular is a TypeScript-based framework for building applications.' },
    { question: 'How do I install Angular CLI?', answer: 'Run `npm install -g @angular/cli` in your terminal.' },
    { question: 'Is Angular better than React?', answer: 'It depends on your project needs. Angular is a full framework, React is a library.' },
  ];

  selectedFaq: any = null;

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

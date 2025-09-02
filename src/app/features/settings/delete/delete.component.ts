import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-delete',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delete.component.html',
  styleUrls: ['./delete.component.scss']
})
export class DeleteComponent {
  openModal(modalId: string): void {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      modalElement.classList.add('show', 'd-block');
      modalElement.setAttribute('aria-modal', 'true');
      modalElement.setAttribute('role', 'dialog');
    }
  }

  closeModal(modalId: string): void {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      modalElement.classList.remove('show', 'd-block');
      modalElement.removeAttribute('aria-modal');
      modalElement.removeAttribute('role');
    }
  }

  submitForm(): void {
    // dummy delete logic
    alert('✅ Dummy: Account deleted successfully.');
    this.closeModal('delete_account_confirm');
  }
}

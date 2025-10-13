import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
// import { Appointment } from '../nectar-month-view/nectar-month-view.component'; // Adjust path

@Component({
  selector: 'nectar-patient-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-list.component.html',
  styleUrls: ['./patient-list.component.scss'],
})
export class PatientListComponent {
  @Input() patientList: any[] = [];

  // A map for status classes is slightly more concise than a switch statement.
  private statusClassMap = {
    booked: 'status-booked',
    completed: 'status-completed',
    cancelled: 'status-cancelled',
  };
  ngOnit(){
    console.log("patientList: ",this.statusClassMap);
  }

  /**
   * Returns a CSS class based on the appointment status.
   */
  getStatusClass(status: 'booked' | 'completed' | 'cancelled' | undefined): string {
    return status ? this.statusClassMap[status] || '' : '';
  }

  /**
   * Gets the initials from a full name (e.g., "John Doe" -> "JD").
   */
  getInitials(fullName: string | undefined | null): string {
    if (!fullName) {
      return '';
    }
    // This logic is already perfect. No changes needed.
    return fullName
      .split(' ')
      .filter(n => n) // Handles multiple spaces between names
      .map(n => n[0])
      .join('');
  }
}
// src/app/pipes/appointment-status.pipe.ts

import { Pipe, PipeTransform } from '@angular/core';

/**
 * Transforms an appointment status number into a corresponding CSS class name.
 * * Assumes a mapping like:
 * 0: 'status-scheduled'
 * 1: 'status-completed'
 * -1: 'status-cancelled'
 * (You might need to adjust the actual return values based on your CSS.)
 */
@Pipe({
  name: 'appointmentStatus',
  standalone: true, // Making it a standalone pipe
})
export class AppointmentStatusPipe implements PipeTransform {
  transform(status: number | undefined | null): string {
    if (status === null || status === undefined) {
      return '';
    }

    switch (status) {
      case 0: // Example: Scheduled
        return 'status-scheduled';
      case 1: // Example: Completed
        return 'status-completed';
      case -1: // Example: Cancelled
        return 'status-cancelled';
      // Add more cases as needed for other status values
      default:
        return '';
    }
  }
}
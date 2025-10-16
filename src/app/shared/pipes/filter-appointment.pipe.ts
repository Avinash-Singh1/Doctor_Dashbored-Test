// src/app/shared/pipes/filter-appointment.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterAppointment',
  standalone: true // Use standalone: true for modern Angular
})
export class FilterAppointmentPipe implements PipeTransform {
  /**
   * Filters an array of objects based on a specific property and value.
   *
   * @param items The array of items to filter.
   * @param propertyName The name of the property to check (e.g., 'status').
   * @param propertyValue The value to match (e.g., 0).
   * @returns The filtered array.
   */
  transform(items: any[] | null | undefined, propertyName: string, propertyValue: any): any[] {
    if (!items || items.length === 0 || propertyName === null || propertyValue === undefined) {
      return items || [];
    }

    return items.filter(item => item[propertyName] === propertyValue);
  }
}
// src/app/shared/pipes/stringify.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'stringify',
  standalone: true // Use standalone: true for modern Angular
})
export class StringifyPipe implements PipeTransform {
  /**
   * Converts a JavaScript value (usually an object) to a JSON string.
   * @param value The value to convert to a JSON string.
   * @returns The JSON string representation of the value.
   */
  transform(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    try {
      return JSON.stringify(value);
    } catch (e) {
      console.error('StringifyPipe failed to stringify value:', value, e);
      return '';
    }
  }
}
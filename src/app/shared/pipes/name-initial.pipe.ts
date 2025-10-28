// src/app/pipes/name-initial.pipe.ts

import { Pipe, PipeTransform } from '@angular/core';
import { Observable, of } from 'rxjs';

/**
 * Extracts the initials (first letter of first and last name) from a full name string.
 * This pipe is used with the 'async' pipe in your template.
 */
@Pipe({
  name: 'nameInitial',
  standalone: true, // Making it a standalone pipe
})
export class NameInitialPipe implements PipeTransform {
  // It returns an Observable<string> because you use the | async pipe in the template
  // {{ (name) | nameInitial | async | uppercase }}
  transform(fullName: string | undefined | null): Observable<string> {
    if (!fullName) {
      return of('');
    }

    const parts = fullName.trim().split(/\s+/);
    let initials = '';

    if (parts.length > 0 && parts[0].length > 0) {
      // Get the first letter of the first name
      initials += parts[0][0];
    }
    
    if (parts.length > 1 && parts[parts.length - 1].length > 0) {
      // Get the first letter of the last name
      initials += parts[parts.length - 1][0];
    } 
    
    // If only one word, just use the first letter of that word
    if (parts.length === 1 && initials.length === 0 && parts[0].length > 0) {
       initials = parts[0][0];
    }

    // Return the result as an observable to satisfy the | async pipe
    return of(initials);
  }
}
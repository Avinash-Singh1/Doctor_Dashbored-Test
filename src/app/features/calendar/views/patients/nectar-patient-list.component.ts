import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface PatientDetail {
  _id: string;
  fullName: string;
  consultationType: 'in_clinic' | 'video';
  time: string;
}

@Component({
  selector: 'nectar-patient-list',
  standalone: true,
  imports: [CommonModule], 
  template: `
    <div class="patient-list-container">
      <div *ngIf="patientList && patientList.length > 0; else noPatients">
        <div *ngFor="let patient of patientList" class="patient-item">
          <strong>{{ patient.fullName }}</strong>
          <span> ({{ patient.time }})</span>
          <span class="type">{{ patient.consultationType | titlecase }}</span>
        </div>
      </div>
      <ng-template #noPatients>
        <div class="no-patients">No appointments for this day.</div>
      </ng-template>
    </div>
  `,
  styles: [`
    .patient-list-container {
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background-color: white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      min-width: 200px;
    }
    .patient-item { margin-bottom: 5px; }
    .patient-item:last-child { margin-bottom: 0; }
    .type { font-size: 0.8em; margin-left: 5px; color: gray; }
    .no-patients { color: #999; }
  `]
})
export class NectarPatientListComponent {
  @Input() patientList: PatientDetail[] = [];
  constructor() { 
  }
  ngOnInit(){
    console.log('NectarPatientListComponent initialized with patientList:', this.patientList);
  }
}

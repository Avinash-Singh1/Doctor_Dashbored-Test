import {
  AfterViewInit,
  Component,
  Inject,
  Input,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ViewContainerRef,
  ChangeDetectionStrategy, // 💡 OPTIMIZATION: Use OnPush
} from '@angular/core';
import { DOCUMENT, CommonModule, TitleCasePipe } from '@angular/common';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import { PatientDetailsComponent } from '../patient-details/patient-details.component'; 

// 💡 NEW IMPORTS: Import the standalone pipes to resolve NG8004 errors
import { AppointmentStatusPipe } from '../../../../shared/pipes/appointment-status.pipe'; 
import { NameInitialPipe } from '../../../../shared/pipes/name-initial.pipe'; 
import { JsonPipe } from '@angular/common'; // 💡 ADDED: JsonPipe for data-patients attribute

export interface PatientDetail {
  _id: string;
  fullName?: string;
  consultationType?: 'in_clinic' | 'video';
  time?: string;
  status?: number;
  patient?: any;
  patientDetails?: any;
}

@Component({
  selector: 'nectar-patient-list',
  standalone: true,
  // 💡 Updated imports with TitleCasePipe and JsonPipe
  imports: [
    CommonModule, 
    TitleCasePipe, // Ensure TitleCasePipe is available for use in the template
    JsonPipe, 
    AppointmentStatusPipe, 
    NameInitialPipe, 
  ],
  template: `
    <div class="patient-list-container">
      <div class="patient-count">
        <span class="count-number">{{ patientList.length || 0 }}</span>
        <span class="count-text">Appointments</span>
      </div>

      <div class="patient-items-wrapper">
        <ng-container *ngFor="let patient of patientList; trackBy: trackByPatientId">
          <div
            class="patient-card"
            [ngClass]="[ patient.status ? (patient.status | appointmentStatus) : '' ]"
            [attr.data-patients]="patient | json"
          >
            <div class="patient-info">
              <div class="img-wrapper">
                <img
                  class="profile-img"
                  [src]="
                    patient?.patient?.patientProfilePic ||
                    patient?.patientDetails?.profilePic
                  "
                  [alt]="(patient?.patient?.patientName || patient?.fullName) | nameInitial | async | uppercase"
                  *ngIf="
                    patient?.patient?.patientProfilePic ||
                    patient?.patientDetails?.profilePic;
                    else initialBlock
                  "
                />
                <ng-template #initialBlock>
                  <span class="initials">
                    {{
                      (patient?.patient?.patientName || patient?.fullName)
                        | nameInitial
                        | async
                        | uppercase
                    }}
                  </span>
                </ng-template>
              </div>

              <div class="patient-name-wrapper">
                <span
                  class="patient-name line-clamp-1"
                  [ngClass]="{ 'cancelled-name': patient.status == -1 }"
                >
                  {{ (patient?.patient?.patientName || patient?.fullName) | titlecase }}
                </span>
                <span class="patient-status-indicator">
                  {{ patient.status | appointmentStatus | titlecase }}
                </span>
              </div>
            </div>

            <div class="time-and-type-details">
              <span class="appointment-time">{{ patient?.time }}</span>
              <span class="consult-type">
                {{ patient?.consultationType | titlecase }}
              </span>
            </div>
          </div>
        </ng-container>

        <div *ngIf="!patientList.length" class="no-patients">
          No appointments for this day.
        </div>
      </div>
    </div>
  `,
  // 💡 OPTIMIZATION: Use OnPush change detection
  changeDetection: ChangeDetectionStrategy.OnPush, 
  styles: [`
    /* ---------------------------------------------------- */
    /* COLOR PALETTE (Using CSS Variables for Consistency) */
    /* ---------------------------------------------------- */
    :host {
      --primary-color: #1852a2;        /* Indigo 600 */
      --primary-light: #EEF2FF;        /* Indigo 50 */
      --text-dark: #1F2937;            /* Dark gray */
      --text-medium: #4B5563;          /* Medium gray */
      --border-color: #E5E7EB;         /* Light border */
      
      /* Status Colors */
      --pending-bg: #FEF3C7;           /* Light Amber */
      --pending-text: #92400E;         /* Dark Amber */
      --completed-bg: #D1FAE5;         /* Light Emerald */
      --completed-text: #065F46;       /* Dark Emerald */
      --cancelled-bg: #FEE2E2;         /* Light Rose */
      --cancelled-text: #991B1B;       /* Dark Rose */
      
      /* Border Accents */
      --pending-border: #F59E0B;       /* Amber 500 */
      --completed-border: #10B981;     /* Emerald 500 */
      --cancelled-border: #EF4444;     /* Rose 500 */
      
      display: block; 
      font-family: 'Inter', sans-serif;
      padding: 1px;
    }

    /* ---------------------------------------------------- */
    /* 1. PROFESSIONAL BASE STYLES */
    /* ---------------------------------------------------- */
    .patient-list-container { 
      background: #f8f9fa; 
      border-radius: 12px; 
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }
    .patient-count { 
      display: flex;
      align-items: baseline;
      gap: 10px;
      padding: 16px 24px;
      background: var(--primary-color); 
      color: #fff;
      font-weight: 600;
    }
    .count-number { 
      font-size: 26px;
      font-weight: 800;
      line-height: 1;
    }
    .count-text {
      font-size: 15px;
      opacity: 0.9;
    }

    .patient-items-wrapper {
      padding: 0;
      background-color: #fff;
    }

    /* ---------------------------------------------------- */
    /* 2. PATIENT CARD STYLING (The List Item) */
    /* ---------------------------------------------------- */
    .patient-card { 
      display: flex; 
      align-items: center; 
      justify-content: space-between;
      padding: 16px 24px;
      cursor: pointer; 
      border-bottom: 1px solid var(--border-color); 
      transition: background-color 0.2s ease, transform 0.1s;
      border-left: 4px solid transparent; 
    }
    .patient-card:hover {
      background-color: #F9FAFB;
      transform: translateY(-1px);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .patient-card:last-child {
      border-bottom: none;
    }

    /* Status-based visual accent (left border) */
    .patient-card.PENDING { border-left-color: var(--pending-border); } 
    .patient-card.COMPLETED { border-left-color: var(--completed-border); }
    .patient-card.CANCELLED { 
      border-left-color: var(--cancelled-border); 
      opacity: 0.75; 
    }

    /* Info Block */
    .patient-info {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
      min-width: 0;
    }

    /* Avatar */
    .img-wrapper { 
      width: 44px;
      height: 44px; 
      background: var(--primary-light); 
      border-radius: 50%; 
      overflow: hidden; 
      flex-shrink: 0; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      border: 2px solid #fff;
      box-shadow: 0 0 0 1px var(--border-color);
    }
    .profile-img { 
      width: 100%; 
      height: 100%; 
      object-fit: cover; 
    }
    .initials {
      font-size: 17px; 
      font-weight: 700;
      color: var(--primary-color);
    }
    
    /* Name */
    .patient-name-wrapper {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .patient-name {
      font-size: 17px;
      font-weight: 700; 
      color: var(--text-dark);
    }
    .cancelled-name {
      text-decoration: line-through;
      color: var(--text-medium);
      font-weight: 500;
    }

    /* Status Indicator (Pill) */
    .patient-status-indicator {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 9999px;
      align-self: flex-start;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .patient-card.PENDING .patient-status-indicator { background: var(--pending-bg); color: var(--pending-text); }
    .patient-card.COMPLETED .patient-status-indicator { background: var(--completed-bg); color: var(--completed-text); }
    .patient-card.CANCELLED .patient-status-indicator { background: var(--cancelled-bg); color: var(--cancelled-text); }


    /* Time and Type */
    .time-and-type-details { 
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
      flex-shrink: 0;
    }
    .appointment-time {
      font-size: 16px;
      color: var(--text-dark); 
      font-weight: 700;
    }
    .consult-type { 
      font-size: 11px;
      padding: 2px 6px;
      background-color: var(--primary-light);
      color: var(--primary-color);
      border-radius: 4px;
      font-weight: 600;
    }
    .line-clamp-1 { 
      overflow: hidden; 
      text-overflow: ellipsis; 
      white-space: nowrap; 
    }

    .no-patients { 
      color: var(--text-medium); 
      padding: 24px;
      text-align: center;
      font-style: italic;
      font-size: 15px;
    }
    
    /* ---------------------------------------------------- */
    /* 3. MOBILE RESPONSIVENESS (BREAKPOINT: 600px) */
    /* ---------------------------------------------------- */
    @media (max-width: 600px) {
      .patient-count {
        padding: 12px 16px;
      }
      .count-number {
        font-size: 22px;
      }
      .count-text {
        font-size: 14px;
      }

      .patient-card {
        padding: 12px 16px;
      }

      .patient-info {
        gap: 12px;
      }
      .img-wrapper {
        width: 40px;
        height: 40px;
      }
      .initials {
        font-size: 16px;
      }
      .patient-name {
        font-size: 16px;
      }
      .patient-status-indicator {
        font-size: 9px;
        padding: 2px 6px;
      }
      
      .appointment-time {
        font-size: 15px;
      }
      .consult-type {
        font-size: 10px;
      }
    }
  `]
})
export class NectarPatientListComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() patientList: PatientDetail[] = [];

  // store tippy instances and component refs to destroy later
  private tippyInstances: TippyInstance[] = [];
  private componentRefs: any[] = [];

  constructor(
    private containerRef: ViewContainerRef,
    @Inject(DOCUMENT) private _document: Document
  ) {}

  // 💡 OPTIMIZATION: Use trackBy for better *ngFor performance
  trackByPatientId(index: number, patient: PatientDetail): string {
    return patient._id;
  }

  ngAfterViewInit(): void {
    // initial attach (if data already present)
    this.attachTooltips();
    console.log("patientList: ",this.patientList);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['patientList']) {
      // data changed — reattach tooltips.
      // small timeout to let Angular render DOM nodes for *ngFor first
      setTimeout(() => {
        this.attachTooltips();
      }, 0);
    }
  }

  private clearExisting() {
    // destroy tippy instances
    this.tippyInstances.forEach(inst => {
      try { inst.destroy(); } catch (e) {}
    });
    this.tippyInstances = [];

    // destroy dynamic component refs
    this.componentRefs.forEach(ref => {
      try { ref.destroy(); } catch (e) {}
    });
    this.componentRefs = [];
  }

  attachTooltips() {
    // clear previous ones
    this.clearExisting();

    // find all patient elements (using the new class name 'patient-card')
    const cells = Array.from(this._document.querySelectorAll('.patient-card')) as HTMLElement[];

    if (!cells.length) {
      console.log('PatientListComponent.attachTooltips: no .patient-card elements found (waiting for DOM). patientList length:', this.patientList?.length);
      return;
    }

    cells.forEach((cell: HTMLElement, i: number) => {
      try {
        // create PatientDetailsComponent dynamically
        const componentRef = this.containerRef.createComponent(PatientDetailsComponent);
        this.componentRefs.push(componentRef);

        // read attribute safely and parse
        const raw = cell.getAttribute('data-patients');
        let parsed = null;
        if (raw) {
          try { parsed = JSON.parse(raw); } catch (err) {
            console.warn('PatientListComponent: failed to JSON.parse data-patients -> using raw string', err);
            parsed = raw;
          }
        }
        componentRef.instance.data = parsed ?? {};
        componentRef.changeDetectorRef.detectChanges();

        const tippyInstance = tippy(cell, {
          content: componentRef.location.nativeElement,
          placement: 'top',
          trigger: 'click',
          arrow: false,
          interactive: true,
          offset: [0, 6],
          zIndex: 10000,
          appendTo: () => this._document.body,
          theme: 'custom-patient'
        });

        // tippy returns an array or single instance depending on input; normalize
        if (Array.isArray(tippyInstance)) {
          tippyInstance.forEach(inst => this.tippyInstances.push(inst));
        } else {
          this.tippyInstances.push(tippyInstance as TippyInstance);
        }

        console.log('Attached tooltip for patient element index', i, 'id', parsed?._id || '(no id)');
      } catch (err) {
        console.error('Error creating tooltip/component for patient element', err);
      }
    });
  }

  ngOnDestroy(): void {
    this.clearExisting();
  }
}

import { CommonModule, DatePipe, JsonPipe } from '@angular/common';
import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

// === 1. INTERFACES ===

export interface Appointment {
  id: string; 
  doctorName: string; 
  _id: string; 
  date: string; // The date of the appointment
  fullName: string;
  reason: string | null;
  status: number; 
  consultationType: 'in_clinic' | 'video';
  doctorDetails: { fullName: string; phone: string; };
  patientDetails: { fullName: string; phone: string; };
}

export interface PatientDetail {
  _id: string;
  fullName: string;
  consultationType: 'in_clinic' | 'video';
  time: string; // e.g., "10:00 AM"
}

// Interface for a day object in the 'weeks' array
interface CalendarDay {
  date: Date;
  isToday: boolean;
  prevMonth: boolean;
  nextMonth: boolean;
  appointmentsCount: number;
  details: PatientDetail[]; 
}

// === 2. NECTAR PATIENT LIST COMPONENT (MOCK) ===

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
    .patient-item {
      margin-bottom: 5px;
    }
    .patient-item:last-child {
      margin-bottom: 0;
    }
    .type {
      font-size: 0.8em;
      margin-left: 5px;
      color: gray;
    }
    .no-patients {
      color: #999;
    }
  `]
})
export class NectarPatientListComponent {
  @Input() patientList: PatientDetail[] = [
    { _id: '1', fullName: 'John Doe', consultationType: 'in_clinic', time: '10:00 AM' },
    { _id: '2', fullName: 'Jane Smith', consultationType: 'video', time: '11:30 AM' }
  ];
}


// === 3. NECTAR MONTH VIEW COMPONENT ===

@Component({
  selector: 'nectar-month-view',
  standalone: true,
  // JsonPipe is kept as it is used for [attr.data-patient-list]="day.details | json"
  imports: [CommonModule, DatePipe, JsonPipe], 
  template: `
    <div class="d-flex flex-column">
      <div class="month-view">
        <table class="calendar-table table">
          <thead>
            <tr class="font-400">
              <th *ngFor="let day of dayHeaders" class="">{{ day }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let week of weeks">
              <td
                *ngFor="let day of week"
                class="calendar-day"
                [ngClass]="{
                  'past-date': day.prevMonth || day.nextMonth,
                  'event-appointment': day.appointmentsCount > 0, 
                  today:
                    (day.date | date : 'dd/MM/yyyy') ==
                    (today | date : 'dd/MM/yyyy')
                }"
                [attr.data-patient-list]="day.details | json"
              >
                <div class="calendar-day-header d-flex flex-column justify-content-between h-100">
                  <div class="d-flex justify-content-end">
                    <strong>{{ day.date | date : "d" }}</strong>
                  </div>
                  <div class="d-flex w-fit">
                    <span class="fs-10">
                      {{ day.appointmentsCount > 0 ? day.appointmentsCount : "" }}
                    </span>
                    <span *ngIf="day.appointmentsCount > 0" class="fs-10"> APPTS</span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    /* Basic styles to visualize the calendar structure using standard CSS/Tailwind concepts */
    .calendar-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .calendar-table th, .calendar-table td {
      border: 1px solid #e0e0e0;
      padding: 0;
      height: 100px; /* fixed height for better visibility */
      text-align: right;
      vertical-align: top;
      cursor: pointer;
      position: relative;
    }
    .calendar-day {
      padding: 8px;
    }
    .calendar-day-header {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 4px;
    }
    .past-date {
      background-color: #f7f7f7;
      color: #999;
    }
    .today {
      border: 2px solid #3b82f6; /* Blue border for today */
      background-color: #eff6ff;
    }
    .event-appointment {
      background-color: #f0fdf4; /* Light green background for appointments */
    }
    .event-appointment strong {
      color: #15803d; /* Darker number for event day */
    }
    .fs-10 {
      font-size: 10px;
      margin-right: 2px;
    }
    .d-flex { display: flex; }
    .flex-column { flex-direction: column; }
    .justify-content-end { justify-content: flex-end; }
    .justify-content-between { justify-content: space-between; }
    .w-fit { width: fit-content; }
    .h-100 { height: 100%; }
  `],
  providers: [DatePipe]
})
export class NectarMonthViewComponent implements OnInit, OnChanges {
  @Input() today: Date = new Date();
  @Input() appointments: Appointment[] = [];
  @Input() currentMonth: Date = new Date();

  weeks: CalendarDay[][] = [];
  dayHeaders: string[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  // Mock patient list for days with appointments, to simulate 'day.details'
  mockPatientList: PatientDetail[] = [
    { _id: '1', fullName: 'John Doe', consultationType: 'in_clinic', time: '10:00 AM' },
    { _id: '2', fullName: 'Jane Smith', consultationType: 'video', time: '11:30 AM' }
  ];

  constructor(private datePipe: DatePipe) {}

  ngOnInit(): void {
    this.generateMonthTable();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['appointments'] || changes['currentMonth']) {
      this.generateMonthTable();
    }
  }

  /**
   * Calculates the number of appointments for a given date.
   */
  getAppointmentsCount(day: Date): number {
    const dayDateString = this.datePipe.transform(day, 'yyyy-MM-dd');
    return this.appointments.filter(
      a => this.datePipe.transform(a.date, 'yyyy-MM-dd') === dayDateString
    ).length;
  }

  /**
   * Generates the calendar structure (weeks and days) and populates it with appointment counts.
   */
  generateMonthTable(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    // 1. Get the first day of the month and its day of the week (0=Sun, 6=Sat)
    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday

    // 2. Calculate the start date of the calendar grid (the Sunday before the 1st, or the 1st itself)
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startDayOfWeek);

    const weeks: CalendarDay[][] = [];
    let currentDay = new Date(startDate);

    // Loop for up to 6 weeks to cover all possibilities
    for (let i = 0; i < 6; i++) {
      const week: CalendarDay[] = [];
      for (let j = 0; j < 7; j++) {
        const appointmentsCount = this.getAppointmentsCount(currentDay);
        
        const dayObject: CalendarDay = {
          date: new Date(currentDay),
          isToday: this.datePipe.transform(currentDay, 'dd/MM/yyyy') === this.datePipe.transform(this.today, 'dd/MM/yyyy'),
          prevMonth: currentDay.getMonth() < month,
          nextMonth: currentDay.getMonth() > month,
          appointmentsCount: appointmentsCount,
          details: appointmentsCount > 0 ? this.mockPatientList : [] 
        };
        
        week.push(dayObject);
        currentDay.setDate(currentDay.getDate() + 1); // Move to the next day
      }

      // Stop if the next month's days are completely into the next month's grid row
      if (week.every(day => day.nextMonth) && weeks.length > 0) {
        break;
      }
      weeks.push(week);
    }
    
    this.weeks = weeks;
  }
}

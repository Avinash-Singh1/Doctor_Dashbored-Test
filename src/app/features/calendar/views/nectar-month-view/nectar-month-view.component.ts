import { CommonModule, DatePipe, JsonPipe } from '@angular/common';
import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewContainerRef, ComponentRef } from '@angular/core';
import tippy, { hideAll, Instance as TippyInstance } from 'tippy.js';
import { NectarPatientListComponent, PatientDetail } from '../patients/nectar-patient-list.component';

export interface Appointment {
  id: string; // mapped from _id
  doctorName: string;
  _id: string;
  date: string;
  fullName: string;
  reason: string | null;
  status: number;
  consultationType: 'in_clinic' | 'video';
  doctorDetails: { fullName: string; phone: string; };
  patientDetails: { fullName: string; phone: string; email: string; profilePic?: string; isverified?: number; };
}

interface CalendarDay {
  date: Date;
  isToday: boolean;
  prevMonth: boolean;
  nextMonth: boolean;
  appointmentsCount: number;
  details: PatientDetail[];
}

@Component({
  selector: 'nectar-month-view',
  standalone: true,
  imports: [CommonModule, DatePipe, JsonPipe],
  template: `
    <div class="d-flex flex-column">
      <div class="month-view">
        <table class="calendar-table table">
          <thead>
            <tr class="font-400">
              <th *ngFor="let day of dayHeaders">{{ day }}</th>
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
                  today: (day.date | date:'dd/MM/yyyy') === (today | date:'dd/MM/yyyy')
                }"
                [attr.data-patient-list]="day.details | json"
                (click)="openAppointments(day, $event)"
              >
                <div class="calendar-day-header d-flex flex-column justify-content-between h-100">
                  <div class="d-flex justify-content-end">
                    <strong>{{ day.date | date:"d" }}</strong>
                  </div>
                  <div class="d-flex w-fit">
                    <span class="fs-10">{{ day.appointmentsCount > 0 ? day.appointmentsCount : '' }}</span>
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
    .calendar-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .calendar-table th, .calendar-table td { border: 1px solid #e0e0e0; padding: 0; height: 100px; text-align: right; vertical-align: top; cursor: pointer; position: relative; }
    .calendar-day { padding: 8px; }
    .calendar-day-header { height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 4px; }
    .past-date { background-color: #f7f7f7; color: #999; }
    .today { border: 2px solid #3b82f6; background-color: #eff6ff; }
    .event-appointment { background-color: #f0fdf4; }
    .event-appointment strong { color: #15803d; }
    .fs-10 { font-size: 10px; margin-right: 2px; }
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
  dayHeaders: string[] = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

  tooltips: TippyInstance[] = [];

  constructor(private datePipe: DatePipe, private vcr: ViewContainerRef) { }

  ngOnInit(): void { this.generateMonthTable(); }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['appointments'] || changes['currentMonth']) this.generateMonthTable();
    console.log('NectarMonthViewComponent initialized with appointments:', this.appointments);
  }

  getAppointmentsCount(day: Date): number {
    const dayStr = this.datePipe.transform(day,'yyyy-MM-dd');
    return this.appointments.filter(a => this.datePipe.transform(a.date,'yyyy-MM-dd') === dayStr).length;
  }

  generateMonthTable(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = firstDayOfMonth.getDay();
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startDayOfWeek);

    const weeks: CalendarDay[][] = [];
    let currentDay = new Date(startDate);

    for (let i = 0; i < 6; i++) {
      const week: CalendarDay[] = [];
      for (let j = 0; j < 7; j++) {
        const count = this.getAppointmentsCount(currentDay);

        // Populate patient details for this day from real API data
        const patientDetails: any = count > 0
          ? this.appointments
              .filter(a => this.datePipe.transform(a.date,'yyyy-MM-dd') === this.datePipe.transform(currentDay,'yyyy-MM-dd'))
              .map(a => ({
                _id: a.id,
                fullName: a.patientDetails.fullName,
                consultationType: a.consultationType,
                time: this.datePipe.transform(a.date, 'hh:mm a') || '',
                phone: a.patientDetails.phone,
                email: a.patientDetails.email || '',
                status: a.status,
                doctorDetails:a.doctorDetails || '',
                isverified: a.patientDetails.isverified,
              }))
          : [];

        const dayObj: CalendarDay = {
          date: new Date(currentDay),
          isToday: this.datePipe.transform(currentDay,'dd/MM/yyyy') === this.datePipe.transform(this.today,'dd/MM/yyyy'),
          prevMonth: currentDay.getMonth() < month,
          nextMonth: currentDay.getMonth() > month,
          appointmentsCount: count,
          details: patientDetails
        };

        week.push(dayObj);
        currentDay.setDate(currentDay.getDate() + 1);
      }

      if (week.every(day => day.nextMonth) && weeks.length > 0) break;
      weeks.push(week);
    }

    this.weeks = weeks;
  }

  openAppointments(day: CalendarDay, event: MouseEvent) {
    if(day.appointmentsCount === 0) return;
    hideAll();

    const componentRef: ComponentRef<NectarPatientListComponent> = this.vcr.createComponent(NectarPatientListComponent);
    console.log("NectarPatientListComponent: ",day);
    componentRef.instance.patientList = day.details;
    componentRef.changeDetectorRef.detectChanges();

    const tooltip = tippy(event.currentTarget as HTMLElement, {
      content: componentRef.location.nativeElement,
      trigger: 'manual',
      interactive: true,
      placement: 'bottom-start',
      arrow: false,
      appendTo: () => document.body,
      onHidden: () => componentRef.destroy()
    });

    tooltip.show();
    this.tooltips.push(tooltip);
  }
}

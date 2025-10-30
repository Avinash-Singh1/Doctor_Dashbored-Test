import { CommonModule, DatePipe, JsonPipe } from '@angular/common';
import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewContainerRef, ComponentRef } from '@angular/core';
import tippy, { hideAll, Instance as TippyInstance } from 'tippy.js';
import { NectarPatientListComponent, PatientDetail } from '../patients/nectar-patient-list.component';

export interface Appointment {
  id: string;
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
  appointmentsCount: number;
  details: PatientDetail[];
}

@Component({
  selector: 'nectar-week-view',
  standalone: true,
  imports: [CommonModule, DatePipe, JsonPipe],
  templateUrl: './nectar-week-view.component.html',
  styleUrls: ['./nectar-week-view.component.scss'],
  providers: [DatePipe]
})
export class NectarWeekViewComponent implements OnInit, OnChanges {
  @Input() today: Date = new Date();
  @Input() appointments: Appointment[] = [];
@Input() currentWeekStart: Date = NectarWeekViewComponent.getStartOfWeek(new Date());

  weekDays: CalendarDay[] = [];
  dayHeaders: string[] = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  tooltips: TippyInstance[] = [];

  constructor(private datePipe: DatePipe, private vcr: ViewContainerRef) {}

  ngOnInit(): void {
    this.generateWeekView();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['appointments'] || changes['currentWeekStart']) {
      this.generateWeekView();
    }
  }

  private static getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Sunday start
    return new Date(d.setDate(diff));
  }

  private getAppointmentsCount(day: Date): number {
    const dayStr = this.datePipe.transform(day, 'yyyy-MM-dd');
    return this.appointments.filter(a => this.datePipe.transform(a.date, 'yyyy-MM-dd') === dayStr).length;
  }

  generateWeekView(): void {
    const startOfWeek = NectarWeekViewComponent.getStartOfWeek(this.currentWeekStart);
    const days: CalendarDay[] = [];

    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startOfWeek);
      currentDay.setDate(startOfWeek.getDate() + i);

      const count = this.getAppointmentsCount(currentDay);
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
              status: a.status || '',
              doctorDetails: a.doctorDetails || '',
              isverified: a.patientDetails.isverified,
            }))
        : [];

      days.push({
        date: currentDay,
        isToday: this.datePipe.transform(currentDay, 'dd/MM/yyyy') === this.datePipe.transform(this.today, 'dd/MM/yyyy'),
        appointmentsCount: count,
        details: patientDetails
      });
    }

    this.weekDays = days;
  }

  openAppointments(day: CalendarDay, event: MouseEvent) {
    if (day.appointmentsCount === 0) return;
    hideAll();

    const componentRef: ComponentRef<NectarPatientListComponent> = this.vcr.createComponent(NectarPatientListComponent);
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

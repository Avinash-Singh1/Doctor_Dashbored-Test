import { CommonModule, DatePipe, JsonPipe } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, ViewContainerRef, ComponentRef } from '@angular/core';
import tippy, { hideAll } from 'tippy.js';
import { NectarPatientListComponent, PatientDetail } from '../patients/nectar-patient-list.component';
import { Appointment } from '../nectar-month-view/nectar-month-view.component';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'nectar-day-view',
  standalone: true,
  imports: [CommonModule, DatePipe,MatIconModule],
  templateUrl: './nectar-day-view.component.html',
  styleUrls: ['./nectar-day-view.component.scss'],
  providers: [DatePipe]
})
export class NectarDayViewComponent implements OnChanges {
  @Input() today: Date = new Date();
  @Input() appointments: Appointment[] = [];

  selectedDateAppointments: Appointment[] = [];
  patientDetails: PatientDetail[] = [];
  selectedDateStr = '';

  constructor(private datePipe: DatePipe, private vcr: ViewContainerRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['appointments'] || changes['today']) {
      this.filterAppointmentsByDay();
    }
  }

  filterAppointmentsByDay(): void {
    const selectedDayStr = this.datePipe.transform(this.today, 'yyyy-MM-dd');
    this.selectedDateAppointments = this.appointments.filter(
      a => this.datePipe.transform(a.date, 'yyyy-MM-dd') === selectedDayStr
    );

    this.patientDetails = this.selectedDateAppointments.map(a => ({
      _id: a.id,
      fullName: a.patientDetails.fullName,
      consultationType: a.consultationType,
      time: this.datePipe.transform(a.date, 'hh:mm a') || '',
      phone: a.patientDetails.phone,
      email: a.patientDetails.email || '',
      status: a.status,
      doctorDetails: a.doctorDetails,
      isverified: a.patientDetails.isverified
    }));

    this.selectedDateStr = this.datePipe.transform(this.today, 'EEEE, d MMMM yyyy') || '';
  }

  openAppointments(): void {
    if (this.patientDetails.length === 0) return;
    hideAll();

    const componentRef: ComponentRef<NectarPatientListComponent> = this.vcr.createComponent(NectarPatientListComponent);
    componentRef.instance.patientList = this.patientDetails;
    componentRef.changeDetectorRef.detectChanges();

    const container = document.querySelector('.day-appointments-container') as HTMLElement;
    if (!container) return;

    const tooltip = tippy(container, {
      content: componentRef.location.nativeElement,
      trigger: 'manual',
      interactive: true,
      placement: 'bottom-start',
      arrow: false,
      appendTo: () => document.body,
      onHidden: () => componentRef.destroy()
    });

    tooltip.show();
  }
}

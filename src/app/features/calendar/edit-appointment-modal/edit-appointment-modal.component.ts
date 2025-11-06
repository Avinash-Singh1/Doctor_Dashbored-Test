import { DatePipe, CommonModule } from "@angular/common";
import { Component, Inject, OnInit, Pipe, PipeTransform } from "@angular/core";
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms";
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { MatInputModule } from "@angular/material/input";
import { MatDatepickerModule, MatCalendarCellCssClasses } from "@angular/material/datepicker";
import { MatNativeDateModule, provideNativeDateAdapter } from "@angular/material/core";
import { MatFormFieldModule } from "@angular/material/form-field";
import { NgSelectModule } from "@ng-select/ng-select";
// --- FIX: Using default import for moment to allow direct function call ---
import moment from 'moment'; // Changed import
import { Observable, of } from 'rxjs'; // Added for mock API return type
import { environment } from "../../../../environments/environment";
import { ApiService } from "../../../core/services/api.service";
// import { EventService } from "../../../core/services/event.service";
// import { LocalStorageService } from "../../../core/services/storage.service";
import { APP_CONSTANTS } from "../../../config/app.constant";
// Custom Pipe
@Pipe({ name: 'avaliableSlot', standalone: true })
export class AvailableSlotPipe implements PipeTransform {
  transform(timingArray: any[], bookedSlot: string[], date: Date): any[] {
    return timingArray.filter(item => item.label && !bookedSlot.includes(item.label));
  }
}

// ------------------- MOCK SERVICES & CONSTANTS (Updated) -------------------
// Mock API Endpoints (Required by reference onSubmit)
const API_ENDPOINTS = {
    doctor: { getCalendarData: '/doctor/calendar' },
    hospital: { getCalendarData: '/hospital/calendar', rescheduleAppointment: '/api/v1/hospital/appointment' },
};
// const APP_CONSTANTS = {
//   USER_TYPES: { HOSPITAL: 3, DOCTOR: 2 },
// };
class EventService {
  broadcastEvent(name: string, data: any) { console.log(`[EventService] Broadcast: ${name}`, data); }
}
class LocalStorageService {
  getItem(key: string): string | null { return null; }
}
function getTimeFromStringDate(time: string, date: Date): number {
  return new Date(date).setHours(10, 0, 0, 0);
}
type DayCodeKey = '0' | '1' | '2' | '3' | '4' | '5' | '6';

// ------------------- COMPONENT -------------------
@Component({
  selector: "nectar-edit-appointment-modal",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    NgSelectModule,
    AvailableSlotPipe,
    
  ],
  templateUrl: "./edit-appointment-modal.component.html",
  styleUrls: ["./edit-appointment-modal.component.scss"],
  providers: [DatePipe, ApiService, EventService, LocalStorageService, provideNativeDateAdapter()]
})
export class EditAppointmentModalComponent implements OnInit {
  heading:any="Edit Appointment";
  editAppointmentForm!: FormGroup;
  timingArray: { label: string | null }[] = [];
  submitted = false;
  today: Date = new Date();
  // Fixed moment call: Removed .default
  maxDate = moment(this.today).endOf("M").add(2, "M").toDate(); 
  dayCode: Record<DayCodeKey, string> = {
    '0': "sun", '1': "mon", '2': "tue", '3': "wed", '4': "thu", '5': "fri", '6': "sat",
  };
  avaliableDay: number[] = [];
  timespendArray = [{ label: "15 min", id: 15 }];
  date = new Date();
  bookedSlot: string[] = [];

  mockEstablishmentTiming = {
    sun: [{ from: '09:00', to: '12:00' }], mon: [],
    tue: [{ from: '14:00', to: '17:00' }], wed: [{ from: '09:00', to: '12:00' }],
    thu: [{ from: '09:00', to: '12:00' }], fri: [{ from: '09:00', to: '12:00' }],
    sat: [{ from: '09:00', to: '12:00' }],
  };

  mockData = {
    patientDetails: { fullName: 'Mock Patient', phone: '9999999999', email: 'mock@example.com' },
    establishmentTiming: this.mockEstablishmentTiming,
    userType: APP_CONSTANTS.USER_TYPES.DOCTOR,
    appointmentId: 'A001', date: new Date(), time: '10:00 AM'
  };

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public matdialogRef: MatDialogRef<EditAppointmentModalComponent>,
    private apiService: ApiService,
    private fb: FormBuilder,
    private datepipe: DatePipe,
    private eventService: EventService,
    private localStorage: LocalStorageService
  ) { 
    this.data = { ...this.mockData, ...data };
  }

  ngOnInit(): void {
    (Object.keys(this.dayCode) as DayCodeKey[]).forEach((key: DayCodeKey) => {
      if (this.data.establishmentTiming?.[this.dayCode[key]]?.length) {
        this.avaliableDay.push(Number(key));
      }
    });
    this.validateForm();
    const initialDate = new Date(this.data.date);
    const patchdata = { ...this.data.patientDetails, date: initialDate, time: this.data.time };
    this.editAppointmentForm.patchValue(patchdata);
    this.getTodayAppointment(initialDate);
  }

  validateForm() {
    this.editAppointmentForm = this.fb.group({
      fullName: [{ value: "", disabled: true }],
      patientId: ["P123456"],
      phone: [{ value: "", disabled: true }],
      email: [{ value: "", disabled: true }],
      date: [null, Validators.required],
      time: [null, Validators.required],
      timespend: [{ value: 15, disabled: true }],
      notes: ["", Validators.required],
      appointmentId: [this.data.appointmentId], // Initialize appointmentId
    });
  }

  get control(): { [key: string]: any } { return this.editAppointmentForm.controls; }

  /**
   * 🚀 MODIFIED onSubmit: Implements time parsing and API call similar to the reference code.
   */
  onSubmit() {
    this.submitted = true;
    if (this.editAppointmentForm.valid) {
      const timeString = this.control["time"].value;
      const timeComponents = timeString.split(":");
      let hour = parseInt(timeComponents[0], 10);
      let minute = parseInt(timeComponents[1].split(" ")[0], 10); // Safely get minutes before AM/PM

      // Adjust the hour value for AM/PM (Logic copied from reference)
      if (timeString.indexOf("PM") !== -1 && hour < 12) {
        hour += 12;
      } else if (timeString.indexOf("AM") !== -1 && hour === 12) {
        hour = 0;
      }

      const payload = {
        date: new Date(
          new Date(this.control["date"].value).setHours(hour, minute, 0, 0)
        ).toISOString(),
        notes: this.control["notes"].value,
      };

      // API Call Logic (Copied from reference)
      this.apiService
        .postParams(`${environment.baseUrl2}${API_ENDPOINTS.hospital.rescheduleAppointment}`, payload, {
          appointmentId: this.data.appointmentId,
        })
        .subscribe({
          next: (res: any) => {
            this.eventService.broadcastEvent(
              "callcalendarapi",
              this.control["date"].value
            );
            this.matdialogRef.close();
          },
          error: (error: any) => {
            console.log(error);
          },
        });
    }
    // alert("I am inside sumit function")
  }

  // Rest of the methods remain unchanged for this request
  getTodayAppointment(date: Date) {
    this.generateList(date);
    this.date = date;
  }

  disableDay = (date: Date): MatCalendarCellCssClasses => {
    return !this.avaliableDay.includes(date.getDay()) ? "disable" : "";
  };

  generateList(date: Date) {
    const dayKey = date.getDay().toString() as DayCodeKey;
    const day = this.dayCode[dayKey];
    const doctorDay = this.data.establishmentTiming?.[day];
    this.timingArray = [];
    if (doctorDay?.length) {
      doctorDay.forEach((slot: any) => {
        const starttime = getTimeFromStringDate(slot.from, date);
        const endtime = getTimeFromStringDate(slot.to, date);
        this.timingArray.push(...this.getTimeListing(starttime, endtime));
      });
    }
  }

  getTimeListing(startTime: number, lastTime: number, interval = environment.DOCTOR_SLOT_TIME): { label: string | null }[] {
    const temp: { label: string | null }[] = [];
    for (let i = startTime; i <= lastTime; i += interval * 60 * 1000) {
      temp.push({ label: this.datepipe.transform(new Date(i), "h:mm a") });
    }
    return temp;
  }
}
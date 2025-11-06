import { Component, Inject, OnInit } from "@angular/core";
import {
  CommonModule
} from "@angular/common";
import {
  ReactiveFormsModule,
  FormsModule,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from "@angular/material/dialog";
import { ApiService } from "../../../core/services/api.service";
import { EventService } from "../../../core/services/event.service";
import { environment } from "../../../../environments/environment";
@Component({
  selector: "nectar-cancel-appointment-modal",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatDialogModule],
  templateUrl: "./cancel-appointment-modal.component.html",
  styleUrls: ["./cancel-appointment-modal.component.scss"],
})
export class CancelAppointmentModalComponent implements OnInit {
  cancelAppointmentForm!: FormGroup;
  submitted = false;

  // ✅ directly define the API endpoint here
  // https://api.nectarplus.health/api/v1/hospital/appointment?appointmentId=69087936c867eedb5a6fbb33
  private readonly CHANGE_APPOINTMENT_STATUS_URL = `${environment.baseUrl2}/api/v1/hospital/appointment`;

  constructor(
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public matdialogRef: MatDialogRef<CancelAppointmentModalComponent>,
    private apiService: ApiService,
    private eventService: EventService
  ) {}

  options = [
    { label: "Patient No-Show", id: "Patient No-Show" },
    { label: "Doctor Unavailable/Busy", id: "Doctor Unavailable/Busy" },
    { label: "Patient Ask To Cancelled", id: "Patient Ask To Cancelled" },
  ];

  ngOnInit(): void {
    this.validateForm();

    const checkArray: FormArray = this.cancelAppointmentForm.get("mode") as FormArray;
    [1, 2].forEach((item) => checkArray.push(new FormControl(item)));
  }

  validateForm() {
    this.cancelAppointmentForm = this.fb.group({
      reason: [null, [Validators.required]],
      mode: this.fb.array([], [Validators.required]),
    });
  }

  onSubmit() {
    this.submitted = true;

    if (this.cancelAppointmentForm.valid) {
      const payload = {
        status: -1,
        ...this.cancelAppointmentForm.value,
      };

      // ✅ use the hardcoded endpoint
      const endpoint = this.CHANGE_APPOINTMENT_STATUS_URL;

      console.log("👉 Endpoint:", endpoint);
      console.log("👉 Payload:", payload);

      this.apiService
        .putParams(endpoint, payload, {
          appointmentId: this.data.appointmentId,
        })
        .subscribe({
          next: () => {
            this.eventService.broadcastEvent("callcalendarapi", this.data.date);
            this.matdialogRef.close();
          },
          error: (error: any) => {
            console.error("❌ API Error:", error);
          },
        });
    }
  }

  onCheckboxChange(e: any) {
    const modeControl = this.cancelAppointmentForm.get("mode");
    if (!modeControl) return;

    modeControl.markAsTouched();
    const checkArray = modeControl as FormArray;

    if (e.target.checked) {
      checkArray.push(new FormControl(e.target.value));
    } else {
      const index = checkArray.controls.findIndex(
        (item) => item.value === e.target.value
      );
      if (index !== -1) checkArray.removeAt(index);
    }
  }

  get control() {
    return this.cancelAppointmentForm.controls;
  }

  get modecontrol() {
    return this.cancelAppointmentForm.get("mode") as FormArray;
  }
}

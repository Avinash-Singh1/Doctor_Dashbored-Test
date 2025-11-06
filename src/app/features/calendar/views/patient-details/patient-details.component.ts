import { Component, EventEmitter, Input, OnInit, Output, signal } from "@angular/core";
import { CommonModule, DatePipe, TitleCasePipe } from "@angular/common";
import { MatDialog } from "@angular/material/dialog";
import { EditAppointmentModalComponent } from "../../edit-appointment-modal/edit-appointment-modal.component";
import { ApiService } from "../../../../core/services/api.service";
import { environment } from "../../../../../environments/environment";
import { EventService } from "../../../../core/services/event.service";
import { CancelAppointmentModalComponent } from "../../cancel-appointment-modal/cancel-appointment-modal.component";

const API_ENDPOINTS = {
  hospital: { changeAppointmentStatus: `${environment.baseUrl2}/api/v1/hospital/appointment`},
};

// --- INTERFACE REFERENCE (Assuming this structure from the parent) ---
export interface Appointment {
  _id: string;
  date: string;
  fullName: string;
  consultationType: 'in_clinic' | 'video';
  doctorDetails: { fullName: string; phone: string; };
  patientDetails: { fullName: string; phone: string; email: string; };
  // Add other properties used in the component, like userType, establishmentTiming
  userType?: number;
  establishmentTiming?: any; 
  status: number;
}
// -------------------------------------------------------------------

@Component({
  selector: 'nectar-patient-details',
  standalone: true,
  // 🎯 FIX: Added DatePipe here to support constructor injection
  providers: [DatePipe], 
  // 🎯 FIX: Added EditAppointmentModalComponent here, as it's used in the code
  imports: [CommonModule, DatePipe, TitleCasePipe], 
  templateUrl: './patient-details.component.html',
  styleUrls: ['./patient-details.component.scss'],
})
export class PatientDetailsComponent implements OnInit {
  // Use the interface for better type safety
  @Input() data: Appointment | any = {}; 
  @Output() closePopup: EventEmitter<any> = new EventEmitter();
  
  loader = signal(false);
  futureDate: boolean = false;
  
  // Dependencies are now correctly injected due to the 'providers' array
  constructor(private matdialog: MatDialog, private datepipe: DatePipe, private apiService: ApiService,private eventService: EventService) {} 
  
  ngOnInit(): void {
    const appointmentDate = new Date(this.data?.date);
    const today = new Date();
    
    // Check if the appointment date is strictly in the future
    this.futureDate = appointmentDate.getTime() > today.getTime();
    console.log('PatientDetailsComponent initialized with data:', this.data);
  }

  /**
   * Helper function to get initials for the profile picture fallback.
   */
  getPatientInitials(): string {
    // 🎯 ADJUSTMENT: Prioritize data.patientDetails.fullName as per parent component's Appointment structure
    const name = this.data?.patientDetails?.fullName || this.data?.fullName;
    if (!name || typeof name !== 'string') return 'NA';
    
    const parts = name.trim().split(/\s+/);
    let initials = '';
    
    if (parts.length > 0 && parts[0]) {
      initials += parts[0][0];
    }
    if (parts.length > 1 && parts[1]) {
      initials += parts[1][0];
    }
    
    return initials.toUpperCase();
  }

  /**
   * Simulated routing method.
   */
  onRouting() {
    console.log(`[ACTION] Navigating to patient profile for ID: ${this.data._id}`);
  }
  
  onOpenDialog(type: string) {
    switch (type) {
      case "edit":
        this.matdialog.open(EditAppointmentModalComponent, {
          panelClass: "edit-appointment-modal",
          width: "720px",
          data: {
            patientDetails: {
              // 🎯 ADJUSTMENT: Use data.patientDetails structure
              fullName: this.data?.patientDetails?.fullName || this.data.fullName,
              phone: this.data?.patientDetails?.phone || this.data.phone,
              email: this.data?.patientDetails?.email || this.data.email,
              date: this.datepipe.transform(
                this.data.date,
                "yyyy-MM-dd",
                "+0530" 
              ),
              time: this.datepipe.transform(this.data.date, "h:mm a", "+0530"),
              appointmentId: this.data._id,
            },
            establishmentTiming: this.data.establishmentTiming,
            doctor: this.data.doctorDetails, // Use the doctorDetails object
            appointmentId: this.data._id,
            userType: this.data?.userType || 2,
          },
          
          autoFocus: false,
        });
        break;
      // case "delete":
      //   this.matdialog.open(DeleteAppointmentModalComponent, {
      //     panelClass: "delete-appointment-modal",
      //     width: "567px",
      //     data: {
      //       appointmentId: this.data._id,
      //       date: this.data.date,
      //     },
      //   });
      //   break;
      case "cancel":
        this.matdialog.open(CancelAppointmentModalComponent, {
          panelClass: "cancel-appointment-modal",
          width: "567px",
          data: {
            appointmentId: this.data._id,
            date: this.data.date,
          },
          autoFocus: false,
        });
    }
  }

  /**
   * Simulated completion of appointment (PUT API call).
   */
  // onComplete() {
  //   if (this.futureDate) {
  //     console.log('[ACTION] Cannot complete a future appointment.');
  //     return;
  //   }

  //   this.loader.set(true);
  //   console.log(`[ACTION] Simulating API call to complete appointment ID: ${this.data._id}`);
    
  //   // Simulate API delay
  //   setTimeout(() => {
  //     this.loader.set(false);
  //     this.data.status = 1; // Update local status to completed
  //     console.log('[API RESPONSE] Appointment marked as COMPLETED locally.');
  //     // You should emit an event here to notify the parent calendar component to refresh/update its list
  //   }, 1500);
  // }

  // new 
  onComplete() {
  const appointmentDate = new Date(this?.data?.date);
  const currentDate = new Date();

  // 🚫 If appointment is in the future, stop here
  if (appointmentDate > currentDate) {
    console.log('[ACTION] Cannot complete a future appointment.');
    return;
  }

  this.loader.set(true);

  this.apiService
    .putParams(
      API_ENDPOINTS.hospital.changeAppointmentStatus,
      { status: 1 },
      {
        appointmentId: this.data._id,
      }
    )
    .subscribe({
      next: (res: any) => {
        this.loader.set(false);
        this.data.status = 1;

        // Broadcast event so parent components (e.g. calendar) refresh data
        this.eventService.broadcastEvent("callcalendarapi", this.data?.date);
        console.log('[SUCCESS] Appointment marked as COMPLETED.');
      },
      error: (error: any) => {
        this.loader.set(false);
        console.error('[ERROR] Failed to complete appointment:', error);
      },
    });
}

  // new 


  /**
   * Emits the close event for the popup/tippy.
   */
  onClosePopup(event: MouseEvent) {
    event.stopPropagation();
    this.closePopup.emit(true);
    console.log('[ACTION] Emitting closePopup event.');
  }
}
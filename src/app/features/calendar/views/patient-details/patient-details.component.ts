import { Component, EventEmitter, Input, OnInit, Output, signal } from "@angular/core";
import { CommonModule, DatePipe, TitleCasePipe } from "@angular/common";
// import { EditAppointmentModalComponent } from "../../edit-appointment-modal/edit-appointment-modal.component";
import { MatDialog } from "@angular/material/dialog";
import { EditAppointmentModalComponent } from "../../edit-appointment-modal/edit-appointment-modal.component";

// Mock imports for external dependencies
// In a real application, you would import these services and components.
// Here, they are simulated to keep the file standalone.

@Component({
  selector: 'nectar-patient-details',
  standalone: true,
  imports: [CommonModule, DatePipe, TitleCasePipe], // Included DatePipe and TitleCasePipe
  templateUrl: './patient-details.component.html',
  styleUrls: ['./patient-details.component.scss'],
})
export class PatientDetailsComponent implements OnInit {
  @Input() data: any = {};
  @Output() closePopup: EventEmitter<any> = new EventEmitter();
  
  // State variables for the component
  loader = signal(false); // Using Angular Signal for state
  futureDate: boolean = false;
  
  constructor(private matdialog: MatDialog,private datepipe: DatePipe) {
    // Injecting DatePipe as a utility for the class (though primarily used in template)
    // NOTE: In a single file, we can't truly "inject" like this without a provider array,
    // but for demonstration, we can instantiate it if needed for class methods.
    // The template uses the built-in pipe, so this is mostly for structure.
    // private datepipe: DatePipe // Omitted the injection for standalone simplicity
  }
  
  ngOnInit(): void {
    // Simplified date check logic for demonstration
    const appointmentDate = new Date(this.data?.date);
    const today = new Date();
    
    // Check if the appointment date is strictly in the future (after today)
    this.futureDate = appointmentDate.getTime() > today.getTime();
    console.log('PatientDetailsComponent initialized with data:', this.data);
  }

  /**
   * Helper function to get initials for the profile picture fallback.
   * Replaces the custom 'nameInitial' pipe logic.
   */
  getPatientInitials(): string {
    const name = this.data?.patient?.patientName || this.data?.fullName;
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
    console.log(`[ACTION] Navigating to patient profile for ID: ${this.data.patientId}`);
    // In a real app: this.router.navigate(...)
  }
  
  /**
   * Simulated dialog opening method.
   */
  // onOpenDialog(type: string) {
  //   console.log(`[ACTION] Opening dialog for type: ${type}`);
  //   // In a real app: this.matdialog.open(ModalComponent, { ... })
  //   // We can simulate state change for demo purposes if needed
  //   if (type === 'delete') {
  //     console.log('Simulating delete action for appointment:', this.data._id);
  //   }
  // }

   onOpenDialog(type: string) {
    switch (type) {
      case "edit":
        this.matdialog.open(EditAppointmentModalComponent, {
          panelClass: "edit-appointment-modal",
          width: "720px",
          data: {
            patientDetails: {
              fullName: this.data?.patient?.patientName ?? this.data.fullName,
              phone: this.data?.patient?.patientPhone ?? this.data.phone,
              email: this.data?.patient?.patientEmail ?? this.data.email,
              date: this.datepipe.transform(
                this.data.date,
                "yyyy-MM-dd",
                "+0530"
              ),
              time: this.datepipe.transform(this.data.date, "h:mm a", "+0530"),
              appointmentId: this.data._id,
            },
            establishmentTiming: this.data.establishmentTiming,
            doctor: this.data?.doctor,
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
      // case "cancel":
      //   this.matdialog.open(CancelAppointmentModalComponent, {
      //     panelClass: "cancel-appointment-modal",
      //     width: "567px",
      //     data: {
      //       appointmentId: this.data._id,
      //       date: this.data.date,
      //     },
      //     autoFocus: false,
      //   });
    }
  }
  /**
   * Simulated completion of appointment (PUT API call).
   */
  onComplete() {
    if (this.futureDate) {
      console.log('[ACTION] Cannot complete a future appointment.');
      return;
    }

    this.loader.set(true);
    console.log(`[ACTION] Simulating API call to complete appointment ID: ${this.data._id}`);
    
    // Simulate API delay
    setTimeout(() => {
      this.loader.set(false);
      this.data.status = 1; // Update local status to completed
      console.log('[API RESPONSE] Appointment marked as COMPLETED locally.');
      // In a real app: this.eventService.broadcastEvent("callcalendarapi", ...)
    }, 1500);
  }

  /**
   * Emits the close event for the popup/tippy.
   */
  onClosePopup(event: MouseEvent) {
    event.stopPropagation();
    this.closePopup.emit(true);
    console.log('[ACTION] Emitting closePopup event.');
    // In a real app: this.eventService.broadcastEvent("closeTippy", true)
  }
}

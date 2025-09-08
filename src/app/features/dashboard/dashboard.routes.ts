import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { CalendarComponent } from '../calendar/calendar.component';
import { MyPatientComponent } from '../my-patient/my-patient.component';
import { MedicalVerificationComponent } from '../medical-verification/medical-verification.component';
import { EstablishmentComponent } from '../establishment/establishment.component';
import { ServicesComponent } from '../services/services.component';
import { ProcedureComponent } from '../procedure/procedure.component';
import { VideosComponent } from '../videos/videos.component';
import { FaqComponent } from '../faq/faq.component';
import { ProfileComponent } from '../profile/profile.component';
import { ReviewsComponent } from '../reviews/reviews.component';
import { SettingsComponent } from '../settings/settings.component';
import { GeneralComponent } from '../settings/general/general.component';
import { NotificationsComponent } from '../settings/notifications/notifications.component';
import { SecurityComponent } from '../settings/security/security.component';
import { DeleteComponent } from '../settings/delete/delete.component';

// 👇 Import the AuthGuard
import { AuthGuard } from '../../core/guards/auth.guard'; 
export const dashboardRoutes: Routes = [
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'calendar', component: CalendarComponent, canActivate: [AuthGuard] },
  { path: 'my-patient', component: MyPatientComponent, canActivate: [AuthGuard] },
  { path: 'medical-verification', component: MedicalVerificationComponent, canActivate: [AuthGuard] },
  { path: 'establishment', component: EstablishmentComponent, canActivate: [AuthGuard] },
  { path: 'services', component: ServicesComponent, canActivate: [AuthGuard] },
  { path: 'procedure', component: ProcedureComponent, canActivate: [AuthGuard] },
  { path: 'videos', component: VideosComponent, canActivate: [AuthGuard] },
  { path: 'faq', component: FaqComponent, canActivate: [AuthGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
  { path: 'reviews', component: ReviewsComponent, canActivate: [AuthGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [AuthGuard] },
  { path: 'settings/general', component: GeneralComponent, canActivate: [AuthGuard] },
  { path: 'settings/notifications', component: NotificationsComponent, canActivate: [AuthGuard] },
  { path: 'settings/security', component: SecurityComponent, canActivate: [AuthGuard] },
  { path: 'settings/delete', component: DeleteComponent, canActivate: [AuthGuard] },
];

// src/app/core/services/medical-verification.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators'; // Import operators
import { CryptoProvider } from './crypto.service'; // Assuming path to your existing service
import { environment } from '../../../environments/environment';

// Assuming your file upload endpoint is under environment.baseUrl2 or a similar config
const FILE_UPLOAD_API = `${environment.baseUrl}/api/v1/common/upload`; // REPLACE with your actual Node.js file upload endpoint

@Injectable({
  providedIn: 'root'
})
export class MedicalVerificationService {
  // Base URL - change to your environment value if needed
  private readonly API_BASE = 'http://localhost:3000';
  private readonly API_BASE2 = 'http://localhost:8080';
  // Profile endpoint (from your request)
  private readonly PROFILE_API = `${environment.baseUrl2}/api/v1/setting/profile`;
  // Profile update endpoint
  private readonly UPDATE_PROFILE_API = `${environment.baseUrl}/doctor/update-profile`;

  // Hard-coded AWS default images (These should now only be used as fallback/initial values)
  public readonly DEFAULT_IDENTITY_URL =
    'https://nector-prod.s3.ap-south-1.amazonaws.com/0aaa5390-9783-11f0-8e82-1168173a397f-Auli_Skiing_Adventure.jpg';
  public readonly DEFAULT_MEDICAL_URL =
    'https://nector-prod.s3.ap-south-1.amazonaws.com/0aa830b0-9783-11f0-8e82-1168173a397f-alleppey-backwater-cruise.jpg';

  constructor(
    private http: HttpClient,
    private crypto: CryptoProvider,
    private fb: FormBuilder
  ) {}

  /**
   * Initializes the Medical Verification forms.
   * NOTE: identityFile/medicalFile now holds the URL string after upload.
   */
  public initializeForms(): { consultationForm: FormGroup, profileForm: FormGroup } {
    const consultationForm = this.fb.group({
      consultationType: ['In-clinic'],
      consultationDetails: this.fb.group({
        isVideo: [true],
        isInClinic: [{ value: true, disabled: true }]
      }),
      regNum: ['', Validators.required],
      regCouncil: ['', Validators.required],
      regYear: ['', Validators.required],
      identityProof: ['', Validators.required],
      medicalProof: ['', Validators.required],
      // These controls now store the S3 URL after a successful upload
      identityFile: [null],
      medicalFile: [null],
      establishmentFile: [null]
    });

    const profileForm = this.fb.group({
      profilePic: [''],
      fullName: ['', [Validators.required]],
      specialization: [null, [Validators.required]],
      experience: [null, [Validators.required]],
      about: ['', [Validators.required]]
    });

    return { consultationForm, profileForm };
  }

  /**
   * Fetches profile data from the server.
   */
  public fetchProfile(): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    // ... (Token handling logic remains the same)
    try {
      const rawToken = localStorage.getItem('authToken');
      if (rawToken) {
        const token = this.crypto.decryptObj(rawToken);
        if (token) {
          headers = headers.set('Authorization', `Bearer ${token}`);
        }
      }
    } catch (e) {
      console.warn('Could not read/decrypt auth token for profile fetch', e);
    }

    return this.http.get<any>(this.PROFILE_API, { headers });
  }
  
  /**
   * NEW: Uploads a file to S3 via your Node.js API.
   * @param file The File object to upload.
   * @returns An Observable that emits the final file URL string or null on error.
   */
  public uploadFile(file: File): Observable<string | null> {
    const formData = new FormData();
    formData.append('file', file);

    // Get the token for authorization header
    let token: string | null = null;
    try {
      token = this.crypto.decryptObj(localStorage.getItem('authToken'));
    } catch (e) {
      console.warn('Failed to decrypt token for file upload', e);
    }
    
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      // 'Content-Type' should NOT be set manually for FormData
    });
    
    // Using FILE_UPLOAD_API endpoint
    return this.http.post(FILE_UPLOAD_API, formData, { headers }).pipe(
      switchMap((res: any) => {
        console.log('File upload response1:', res);
        console.log('File upload response2:', res.data);
        console.log('File upload response3:', res.data?.url);
        // Assuming your API response structure is { success: true, result: { uri: { uri: 'S3_URL' } } }
        if (res.data?.url) {
          return of(res.data.url); // Return the S3 URL
        } else {
          // API succeeded but didn't return a URL
          return of(null); 
        }
      }),
      catchError((error) => {
        console.error('File upload error in service:', error);
        return of(null); // Signal upload failure
      })
    );
  }

  /**
   * Constructs the payload and submits the verification data.
   * MODIFIED: Uses identityFile/medicalFile (which holds the S3 URL) for the proof URLs.
   * @param consultationFormValue - The raw value of the consultation form.
   * @param profileFormValue - The raw value of the profile form (for full name).
   * @param filenames - Object containing current filenames for identity/medical proofs.
   */
  public submitVerification(
    consultationFormValue: any,
    profileFormValue: any,
    filenames: { identityProofFilename: string | null, medicalProofFilename: string | null }
  ): Observable<any> {
    // Get the S3 URLs from the form controls (which are set after successful upload)
    const identityUrl = consultationFormValue.identityFile || this.DEFAULT_IDENTITY_URL;
    const medicalUrl = consultationFormValue.medicalFile || this.DEFAULT_MEDICAL_URL;

    const payload = {
      steps: 2,
      isEdit:
        consultationFormValue.regNum !== '' &&
        consultationFormValue.regCouncil !== '' &&
        consultationFormValue.consultationType !== '',
      isSaveAndExit: false,
      records: {
        doctor: {
          medicalRegistration: {
            registrationNumber: consultationFormValue.regNum,
            council: consultationFormValue.regCouncil,
            year: consultationFormValue.regYear
          },
          identityProof: [
            {
              url: identityUrl, // Use the uploaded S3 URL (or default if not uploaded)
              filename: filenames.identityProofFilename || 'identity_default.jpg',
              fileType: this.isImage(identityUrl) ? 'image' : 'pdf', // Assuming simple file type check
              urlType: consultationFormValue.identityProof || 'Aadhar Card'
            }
          ],
          medicalProof: [
            {
              url: medicalUrl, // Use the uploaded S3 URL (or default if not uploaded)
              filename: filenames.medicalProofFilename || 'medical_default.jpg',
              fileType: this.isImage(medicalUrl) ? 'image' : 'pdf', // Assuming simple file type check
              urlType: consultationFormValue.medicalProof || 'Medical Council Reg. Certificate'
            }
          ]
        },
        consultationType: consultationFormValue.consultationType || 'In-clinic',
        consultationDetails: {
          isVideo: consultationFormValue.consultationDetails?.isVideo ?? true,
          isInClinic: consultationFormValue.consultationDetails?.isInClinic ?? true
        }
      },
      profile: {
        fullName: profileFormValue.fullName || ''
      }
    };

    // Save draft locally
    localStorage.setItem('medicalVerificationDraft', JSON.stringify(payload));
    console.log('Payload (using S3 URL from form controls):', payload);

    let token: string | null = null;
    try {
      token = this.crypto.decryptObj(localStorage.getItem('authToken'));
    } catch (e) {
      console.warn('Failed to decrypt token for submit', e);
    }
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.put(this.UPDATE_PROFILE_API, payload, { headers });
  }

  /**
   * Helper function to read a file as a Data URL for local preview.
   * (Kept as is, but may no longer be necessary if you only use S3 URLs for preview.)
   */
  public readFileAsDataUrl(file: File): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Utility to check if a data URL is for an image (or a URL is an image).
   * MODIFIED to also check URL extensions as a proxy for file type.
   */
  public isImage(url: string | null): boolean {
    if (!url) return false;
    if (url.startsWith('data:image/')) return true; // Data URL check
    // Simple URL extension check for image vs pdf (assuming pdf is the main non-image type)
    const lowerUrl = url.toLowerCase();
    return lowerUrl.endsWith('.png') || lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg');
  }
}

// src/app/core/services/medical-verification.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { CryptoProvider } from './crypto.service'; // Assuming path to your existing service

@Injectable({
  providedIn: 'root'
})
export class MedicalVerificationService {
  // Base URL - change to your environment value if needed
  private readonly API_BASE = 'http://localhost:3000';
  private readonly API_BASE2 = 'http://localhost:8080';
  // Profile endpoint (from your request)
  private readonly PROFILE_API = `${this.API_BASE2}/api/v1/setting/profile`;
  // Profile update endpoint
  private readonly UPDATE_PROFILE_API = `${this.API_BASE}/doctor/update-profile`;

  // Hard-coded AWS default images (from your reference payload)
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
      identityFile: [null], // Placeholder for actual File object for upload
      medicalFile: [null], // Placeholder for actual File object for upload
      establishmentFile: [null] // Placeholder for actual File object for upload
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
   * Constructs the payload and submits the verification data.
   * NOTE: The original logic dictated using hard-coded AWS URLs for proofs in the payload.
   * This logic is preserved here.
   * @param consultationFormValue - The raw value of the consultation form.
   * @param profileFormValue - The raw value of the profile form (for full name).
   * @param filenames - Object containing current filenames for identity/medical proofs.
   */
  public submitVerification(
    consultationFormValue: any,
    profileFormValue: any,
    filenames: { identityProofFilename: string | null, medicalProofFilename: string | null }
  ): Observable<any> {

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
          // always send the AWS default URLs (hard-coded)
          identityProof: [
            {
              url: this.DEFAULT_IDENTITY_URL,
              filename: filenames.identityProofFilename || 'identity_default.jpg',
              fileType: 'image',
              urlType: consultationFormValue.identityProof || 'Aadhar Card'
            }
          ],
          medicalProof: [
            {
              url: this.DEFAULT_MEDICAL_URL,
              filename: filenames.medicalProofFilename || 'medical_default.jpg',
              fileType: 'image',
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

    // Save draft locally (still helpful fallback)
    localStorage.setItem('medicalVerificationDraft', JSON.stringify(payload));
    console.log('Payload (using AWS defaults for proof images):', payload);

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
   * Utility to check if a data URL is for an image.
   */
  public isImage(dataUrl: string | null): boolean {
    if (!dataUrl) return false;
    return dataUrl.startsWith('data:image/');
  }

}
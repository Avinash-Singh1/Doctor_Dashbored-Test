import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CryptoProvider } from '../../core/services/crypto.service';
import { environment } from '../../../environments/environment'; 

// --- Interfaces ---

export interface FaqItem {
  id?: string;
  question: string;
  answer: string;
}

// Internal API structure for consistency
interface ApiFaqItem {
  _id: string;
  question: string;
  answer: string;
  userType: number;
  userId: string;
  createdAt: string;
}

interface ListApiResponse {
  result: { data: ApiFaqItem[] };
}

interface AddApiResponse {
  result: ApiFaqItem;
}

// --- API Configuration ---
const API_BASE = `${environment.baseUrl2}/api/v1`;
const API_ENDPOINTS = {
  LIST: '/faq/all-faq', // GET
  CRUD: '/faq',         // POST, DELETE (via path), PUT (unconfirmed, but common)
};
const USER_TYPE = 2;
const TOKEN_KEY = 'authToken';

// --- Service ---
@Injectable({
  providedIn: 'root',
})
export class FaqService {

  private currentUser: any; // Stored user object from component's constructor logic

  constructor(
    private http: HttpClient,
    private crypto: CryptoProvider
  ) {
    // Synchronously load user data needed for API calls
    const rawAuthUser = localStorage.getItem('authUser');
    this.currentUser = rawAuthUser ? this.crypto.decryptObj(rawAuthUser) : null;
  }

  /**
   * Builds the Authorization header using the decrypted token.
   */
  private getAuthHeader(): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    try {
      const enc = localStorage.getItem(TOKEN_KEY);
      if (enc) {
        const token = this.crypto.decryptObj(enc);
        if (token) {
          headers = headers.set('Authorization', `Bearer ${token}`);
        }
      }
    } catch (e) {
      console.warn('Failed to decrypt token for FAQ service.');
    }
    return headers;
  }

  private getUserId(): string | null {
    // Use doctorId from the decoded user, which the original component relies on.
    return this.currentUser?.doctorId ?? null;
  }

  /**
   * Fetches the FAQ list for the current user.
   */
  public getFaqs(): Observable<FaqItem[]> {
    const userId = this.getUserId();
    if (!userId) {
      return throwError(() => new Error('User context missing. Cannot fetch FAQs.'));
    }

    const url = `${API_BASE}${API_ENDPOINTS.LIST}?id=${encodeURIComponent(userId)}&userType=${USER_TYPE}`;

    return this.http
      .get<ListApiResponse>(url)
      .pipe(
        map((res) => {
          const rows = res?.result?.data ?? [];
          return rows.map((r) => ({
            id: r._id,
            question: (r.question ?? '').trim(),
            answer: (r.answer ?? '').trim(),
          }));
        }),
        catchError((err) => {
          console.error('Service Failed to load FAQs', err);
          return throwError(() => err);
        })
      );
  }

  /**
   * Adds a new FAQ item.
   */
  public addFaq(question: string, answer: string): Observable<FaqItem> {
    const userId = this.getUserId();
    if (!userId) {
      return throwError(() => new Error('User context missing. Cannot add FAQ.'));
    }
    
    const payload = {
      question: question.trim(),
      answer: answer.trim(),
      userType: USER_TYPE,
      userId: userId,
    };

    const url = `${API_BASE}${API_ENDPOINTS.CRUD}`;

    return this.http
      .post<AddApiResponse>(url, payload, { headers: this.getAuthHeader() })
      .pipe(
        map((res) => {
          const r = res?.result;
          if (!r) throw new Error('Invalid response from server.');
          return {
            id: r._id,
            question: (r.question ?? '').trim(),
            answer: (r.answer ?? '').trim(),
          } as FaqItem;
        }),
        catchError((err) => {
          console.error('Service Failed to add FAQ', err);
          return throwError(() => err);
        })
      );
  }

  /**
   * Updates an existing FAQ item.
   * NOTE: Your component currently handles this locally without an API call. 
   * This method assumes a PUT endpoint exists for completeness, though it is not used by the refactored component yet.
   */
  public updateFaq(faq: FaqItem): Observable<FaqItem> {
      // API payload requires userType and userId which are not on FaqItem.
      // This is a common service pitfall. We rely on the FaqService constructor 
      // to supply these details via its internal state.
      const userId = this.getUserId();
      if (!userId || !faq.id) {
          return throwError(() => new Error('Missing ID or user context for update.'));
      }

      const payload = {
          question: faq.question.trim(),
          answer: faq.answer.trim(),
          userType: USER_TYPE,
          userId: userId,
      };

      const url = `${API_BASE}${API_ENDPOINTS.CRUD}/${faq.id}`;
      // Assuming PUT to /faq/id updates the FAQ
      return this.http.put<AddApiResponse>(url, payload, { headers: this.getAuthHeader() })
        .pipe(
            map(() => faq), // Return the item if the API call is successful
            catchError((err) => {
                console.error('Service Failed to update FAQ', err);
                return throwError(() => err);
            })
        );
  }
  
  /**
   * Deletes an FAQ item.
   */
  public deleteFaq(faqId: string): Observable<any> {
    const url = `${API_BASE}${API_ENDPOINTS.CRUD}/${faqId}`;

    return this.http
      .delete<{ success: boolean; message: string }>(url, { headers: this.getAuthHeader() })
      .pipe(
        catchError((err) => {
          console.error('Service Failed to delete FAQ', err);
          return throwError(() => err);
        })
      );
  }
}
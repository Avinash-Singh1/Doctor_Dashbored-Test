import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CryptoProvider } from '../../core/services/crypto.service';
import { AuthService } from '../../core/services/auth.service'; // Needed for token clearing/navigation
import { environment } from '../../../environments/environment';
// --- Interface for Video Data (FAQ) ---
export interface VideoItem {
  _id: string;
  userId: string;
  title: string;
  url: string; // The sanitized, embeddable URL
  rawUrl?: string; // Optional: The original URL for the Edit modal
  createdAt: string;
  userType?: number;
}

// --- API Endpoints Configuration ---
const API_BASE = `${environment.baseUrl}`;
const API_ENDPOINTS = {
  LIST: '/video/list', // GET
  CRUD: '/video',     // POST, PUT, DELETE
};

const QUERY_USER_TYPE = 2; // Constant from original component

// --- Service ---
@Injectable({
  providedIn: 'root',
})
export class VideosService {

  // Current user info will be stored here, derived from localStorage in constructor
  private currentUser: any;

  constructor(
    private http: HttpClient,
    private crypto: CryptoProvider,
    private auth: AuthService
  ) {
    // Synchronous initial loading of user data
    const rawAuthUser = localStorage.getItem('authUser');
    this.currentUser = rawAuthUser ? this.crypto.decryptObj(rawAuthUser) : null;
  }

  /**
   * Builds the Authorization header and handles token validation.
   */
  private getAuthHeader(): HttpHeaders {
    const enc = localStorage.getItem('authToken');
    const token = enc ? this.crypto.decryptObj(enc) : null;
    
    // NOTE: Navigation/token-clearing logic must stay in the component 
    // or a shared interceptor/auth service if you want to redirect.
    // We only return the header here.
    if (!token) {
      // Log for debugging if service is called without a token
      console.warn('Attempted API call without a valid token.');
      return new HttpHeaders(); 
    }
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  /**
   * Converts common YouTube links to embeddable URLs.
   * This logic is crucial for the component's iframe display.
   */
  public toYouTubeEmbed(url: string): string {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) {
        const id = u.pathname.replace('/', '');
        return `https://www.youtube.com/embed/${id}`;
      }
      if (u.hostname.includes('youtube.com')) {
        const id = u.searchParams.get('v');
        if (id) return `https://www.youtube.com/embed/${id}`;
        if (u.pathname.startsWith('/embed/')) return url;
      }
    } catch { /* ignore invalid URLs */ }
    return url.replace('watch?v=', 'embed/'); // generic fallback
  }

  /**
   * Fetches the doctor's video list.
   */
  public getVideos(): Observable<VideoItem[]> {
    if (!this.currentUser?.doctorId) {
        return throwError(() => new Error('User ID not available for fetching videos.'));
    }

    const params = new HttpParams()
      .set('id', this.currentUser.doctorId)
      .set('userType', String(QUERY_USER_TYPE));

    return this.http
      .get<any>(`${API_BASE}${API_ENDPOINTS.LIST}`, {
        headers: this.getAuthHeader(),
        params,
      })
      .pipe(
        map((res) => {
          const items = res?.result?.data ?? [];
          return items.map((v: any): VideoItem => ({
            _id: v._id,
            userId: v.userId,
            title: v.title,
            url: this.toYouTubeEmbed(v.url),
            rawUrl: v.url, // Keep the original URL for editing purposes
            createdAt: v.createdAt,
            userType: v.userType,
          }));
        }),
        catchError((err) => {
          console.error('Service Failed to load videos', err);
          return throwError(() => err);
        })
      );
  }

  /**
   * Adds a new video.
   * @param title The video title.
   * @param rawUrl The raw YouTube URL.
   */
  public addVideo(title: string, rawUrl: string): Observable<VideoItem> {
    const embedUrl = this.toYouTubeEmbed(rawUrl);

    // Fallback logic from the component (assuming current user object has userId)
    const userId = this.currentUser?.userId || '65716d561eece2ff479fba09'; 

    const payload = {
      title,
      url: embedUrl,
      userType: QUERY_USER_TYPE,
      userId
    };

    return this.http
      .post<any>(`${API_BASE}${API_ENDPOINTS.CRUD}`, payload, {
        headers: this.getAuthHeader(),
      })
      .pipe(
        map((res) => {
          const r = res?.result;
          if (!r) throw new Error('Invalid response from server.');
          return {
            _id: r._id,
            userId: r.userId,
            title: r.title,
            url: this.toYouTubeEmbed(r.url), // Ensure the returned URL is sanitized again
            rawUrl: r.url,
            createdAt: r.createdAt,
            userType: r.userType,
          } as VideoItem;
        }),
        catchError((err) => {
          console.error('Service Failed to add video', err);
          return throwError(() => err);
        })
      );
  }

  /**
   * Updates an existing video.
   * @param videoId The ID of the video to update.
   * @param title The new title.
   * @param rawUrl The new raw YouTube URL.
   * @param currentUserId The userId required for the PUT payload.
   */
  public updateVideo(
    videoId: string, 
    title: string, 
    rawUrl: string, 
    currentUserId: string
  ): Observable<VideoItem> {
    const embedUrl = this.toYouTubeEmbed(rawUrl);

    const params = new HttpParams().set('id', videoId);
    const payload = {
      title,
      userType: QUERY_USER_TYPE,
      url: embedUrl,
      userId: currentUserId 
    };

    return this.http
      .put<any>(`${API_BASE}${API_ENDPOINTS.CRUD}`, payload, {
        headers: this.getAuthHeader(),
        params
      })
      .pipe(
        map((res) => {
            const updated = res?.result;
            if (!updated) throw new Error('Invalid response from server.');
            return {
                _id: updated._id,
                userId: updated.userId,
                title: updated.title,
                url: this.toYouTubeEmbed(updated.url),
                rawUrl: updated.url,
                createdAt: updated.createdAt,
                userType: updated.userType
            } as VideoItem;
        }),
        catchError((err) => {
          console.error('Service Failed to update video', err);
          return throwError(() => err);
        })
      );
  }

  /**
   * Deletes a video.
   * @param videoId The ID of the video to delete.
   */
  public deleteVideo(videoId: string): Observable<any> {
    const params = new HttpParams().set('id', videoId);

    return this.http
      .delete<any>(`${API_BASE}${API_ENDPOINTS.CRUD}`, {
        headers: this.getAuthHeader(),
        params,
      })
      .pipe(
        catchError((err) => {
          console.error('Service Failed to delete video', err);
          return throwError(() => err);
        })
      );
  }
}
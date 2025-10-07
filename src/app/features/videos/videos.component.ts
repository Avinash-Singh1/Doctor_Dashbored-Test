// src/app/features/videos/videos.component.ts
import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  OnDestroy,
  Renderer2
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../core/services/auth.service'; // <-- adjust path if needed
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule, HttpHeaders, HttpParams } from '@angular/common/http';
import { CryptoProvider } from '../../core/services/crypto.service';

@Component({
  selector: 'app-videos',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './videos.component.html',
  styleUrls: ['./videos.component.scss'],
})
export class VideosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  faqsList: Array<{
    _id: string;
    userId: string;     // <-- keep userId so we can send it in PUT payload
    title: string;
    url: string;        // embed URL for iframe
    createdAt: string;  // ISO date
    userType?: number;  // optional, comes from API
  }> = [];

  selectedId: string | null = null;
  isSubmenuOpen = false;

  // UI state
  loading = false;
  error: string | null = null;

  // ---- API config (inline, no external service) ----
  private readonly API_BASE = 'http://82.112.237.181:8080/api/v1';
  private readonly LIST_PATH = '/video/list';
  private readonly EDIT_PATH = '/video'; // PUT
  // private readonly QUERY_LIST_ID = '65716d561eece2ff479fba0b'; // list API "id"
  private readonly QUERY_USER_TYPE = 2;
  currentUser:any;

  constructor(
    private renderer: Renderer2,
    private sanitizer: DomSanitizer,
    private auth: AuthService,
    private router: Router,
    private http: HttpClient,
    private crypto: CryptoProvider
  ) {
    this.currentUser = this.crypto.decryptObj(localStorage.getItem('authUser'));
    console.log("Video: user ", this.currentUser);

  }

  // Build auth header using dynamic token from localStorage (decrypted)
  private getAuthHeader(): HttpHeaders {
    const enc = localStorage.getItem('authToken');
    const token = enc ? this.crypto.decryptObj(enc) : null; // <-- dynamic token as you requested
    if (!token) {
      if (typeof this.auth.clearToken === 'function') this.auth.clearToken();
      if (!this.router.url.startsWith('/auth/login')) this.router.navigate(['/auth/login']);
      return new HttpHeaders();
    }
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  ngOnInit(): void {
    // 1) immediate synchronous check
    if (!this.auth.hasValidToken()) {
      if (typeof this.auth.clearToken === 'function') this.auth.clearToken();
      this.router.navigate(['/auth/login']);
      return;
    }

    // 2) subscribe to auth state changes
    this.auth.isLoggedIn$().pipe(takeUntil(this.destroy$)).subscribe((isLogged) => {
      if (!isLogged && !this.router.url.startsWith('/auth/login')) {
        this.router.navigate(['/auth/login']);
      }
    });

    // 3) listen for storage events (cross-tab / external clears)
    window.addEventListener('storage', this.onStorageEvent);

    // Fetch from API (replaces hardcoded loadVideos)
    this.fetchVideosFromApi();
  }

  private onStorageEvent = (ev: StorageEvent) => {
    const relevantKeys = ['authToken', 'authUser', 'deviceId'];
    if (ev.key === null || relevantKeys.includes(ev.key)) {
      if (!this.auth.hasValidToken()) {
        if (typeof this.auth.clearToken === 'function') this.auth.clearToken();
        if (!this.router.url.startsWith('/auth/login')) this.router.navigate(['/auth/login']);
      }
    }
  };

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('storage', this.onStorageEvent);
  }

  /** === API fetch (inline) === */
  private fetchVideosFromApi(): void {
    this.loading = true;
    this.error = null;

    const params = new HttpParams()
      .set('id', this.currentUser.doctorId)
      .set('userType', String(this.QUERY_USER_TYPE));

    this.http
      .get<any>(`${this.API_BASE}${this.LIST_PATH}`, {
        headers: this.getAuthHeader(),
        params,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const items = res?.result?.data ?? [];
          this.faqsList = items.map((v: any) => ({
            _id: v._id,
            userId: v.userId,
            title: v.title,
            url: this.toYouTubeEmbed(v.url),
            createdAt: v.createdAt,
            userType: v.userType
          }));
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load videos', err);
          this.error = err?.error?.message || 'Failed to load videos. Please try again.';
          this.loading = false;
        },
      });
  }

  /** Convert common YouTube links to embeddable URLs */
  private toYouTubeEmbed(url: string): string {
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
    } catch { /* ignore */ }
    return url.replace('watch?v=', 'embed/'); // generic fallback
  }

  /** Add Video (local-only) */
  // handleAddVideo(): void {
  //   const titleInput = document.getElementById('addTitle') as HTMLInputElement;
  //   const urlInput = document.getElementById('addUrl') as HTMLInputElement;

  //   if (titleInput?.value && urlInput?.value) {
  //     this.faqsList.push({
  //       _id: (this.faqsList.length + 1).toString(),
  //       userId: '', // unknown for local-only add
  //       title: titleInput.value,
  //       url: this.toYouTubeEmbed(urlInput.value),
  //       createdAt: new Date().toISOString(),
  //     });

  //     titleInput.value = '';
  //     urlInput.value = '';
  //     this.closeModal('addFaqModal');
  //   }
  // }

  handleAddVideo(): void {
  const titleInput = document.getElementById('addTitle') as HTMLInputElement;
  const urlInput = document.getElementById('addUrl') as HTMLInputElement;

  const title = titleInput?.value?.trim();
  const rawUrl = urlInput?.value?.trim();

  if (!title || !rawUrl) return;

  const embedUrl = this.toYouTubeEmbed(rawUrl);

  // Use userId from existing list item if present; otherwise fall back to your known userId
  const userId =
    this.faqsList.find(v => !!v.userId)?.userId || '65716d561eece2ff479fba09';

  const payload = {
    title,
    url: embedUrl,
    userType: this.QUERY_USER_TYPE,
    userId
  };

  this.http
    .post<any>(`${this.API_BASE}/video`, payload, {
      headers: this.getAuthHeader(),
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (res) => {
        const r = res?.result;
        if (r?._id) {
          // prepend the newly created video using server data
          this.faqsList = [
            {
              _id: r._id,
              userId: r.userId,
              title: r.title,
              url: this.toYouTubeEmbed(r.url),
              createdAt: r.createdAt,
              userType: r.userType,
            },
            ...this.faqsList,
          ];
        }
        // reset form + close modal
        titleInput.value = '';
        urlInput.value = '';
        this.closeModal('addFaqModal');
      },
      error: (err) => {
        console.error('Failed to add video', err);
        // optionally surface an error message:
        // this.error = err?.error?.message || 'Failed to add video.';
      },
    });
}


  /** Edit Video -> open modal (no API yet) */
  onEditVideo(video: any): void {
    this.selectedId = video._id;
    (document.getElementById('editTitle') as HTMLInputElement).value = video.title;
    (document.getElementById('editUrl') as HTMLInputElement).value = video.url;
    this.openModal('editFaqModal');
  }

  /** Save changes -> PUT /video?id=<selectedId> with payload, then update local list */
  handleEditVideo(): void {
    const title = (document.getElementById('editTitle') as HTMLInputElement).value?.trim();
    const rawUrl = (document.getElementById('editUrl') as HTMLInputElement).value?.trim();
    const embedUrl = this.toYouTubeEmbed(rawUrl);

    if (!this.selectedId) {
      this.closeModal('editFaqModal');
      return;
    }

    // Find current item to get userId for payload
    const current = this.faqsList.find(v => v._id === this.selectedId);
    const userIdForPayload = current?.userId || '65716d561eece2ff479fba09'; // fallback to your example userId

    const params = new HttpParams().set('id', this.selectedId);
    const payload = {
      title,
      userType: this.QUERY_USER_TYPE,
      url: embedUrl,
      userId: userIdForPayload
    };

    // Optimistic local update (optional): comment out if you prefer to wait for server response
    this.faqsList = this.faqsList.map((v) =>
      v._id === this.selectedId ? { ...v, title, url: embedUrl } : v
    );

    this.http
      .put<any>(`${this.API_BASE}${this.EDIT_PATH}`, payload, {
        headers: this.getAuthHeader(),
        params
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          // Use server-confirmed values
          const updated = res?.result;
          if (updated?._id) {
            this.faqsList = this.faqsList.map((v) =>
              v._id === updated._id
                ? {
                    _id: updated._id,
                    userId: updated.userId,
                    title: updated.title,
                    url: this.toYouTubeEmbed(updated.url),
                    createdAt: updated.createdAt,
                    userType: updated.userType
                  }
                : v
            );
          }
          this.closeModal('editFaqModal');
        },
        error: (err) => {
          console.error('Failed to update video', err);
          // revert optimistic update if desired
          this.fetchVideosFromApi();
          this.closeModal('editFaqModal');
        },
      });
  }

  /** Delete Video (local-only) */
  // onDeleteVideo(): void {
  //   if (this.selectedId) {
  //     this.faqsList = this.faqsList.filter((v) => v._id !== this.selectedId);
  //     this.closeModal('editFaqModal');
  //   }
  // }
  onDeleteVideo(): void {
  if (!this.selectedId) return;

  const params = new HttpParams().set('id', this.selectedId);

  this.http
    .delete<any>(`${this.API_BASE}${this.EDIT_PATH}`, {
      headers: this.getAuthHeader(),
      params,
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        // remove locally after successful delete
        this.faqsList = this.faqsList.filter(v => v._id !== this.selectedId);
        this.selectedId = null;
        this.closeModal('editFaqModal');
      },
      error: (err) => {
        console.error('Failed to delete video', err);
        // optional: surface an error message or refresh list
        // this.error = err?.error?.message || 'Failed to delete video.';
        this.closeModal('editFaqModal');
      }
    });
}


  /** Helpers */
  trackById = (_: number, v: { _id: string }) => v._id;

  formatDate(date: any): string {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  sanitizeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  /** Modal handling */
  openModal(modalId: string): void {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      modalElement.classList.add('show', 'd-block');
      modalElement.setAttribute('aria-modal', 'true');
      modalElement.setAttribute('role', 'dialog');
    }
  }

  closeModal(modalId: string): void {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      modalElement.classList.remove('show', 'd-block');
      modalElement.removeAttribute('aria-modal');
      modalElement.removeAttribute('role');
    }
  }

  /** Sidebar handling */
  onMenuClick() {
    const sideMenu = document.getElementById('sideMenu');
    const innerArea = document.getElementById('clickToCloseArea');
    if (sideMenu && innerArea) {
      if (
        sideMenu.classList.contains('mobileMenu') &&
        innerArea.classList.contains('openedSideBar')
      ) {
        this.renderer.removeClass(sideMenu, 'mobileMenu');
        this.renderer.removeClass(innerArea, 'openedSideBar');
      } else {
        this.renderer.addClass(sideMenu, 'mobileMenu');
        this.renderer.addClass(innerArea, 'openedSideBar');
      }
    }
  }

  closeSideBar() {
    const innerArea = document.getElementById('clickToCloseArea');
    const sideMenu = document.getElementById('sideMenu');
    if (innerArea?.classList.contains('openedSideBar')) {
      this.renderer.removeClass(innerArea, 'openedSideBar');
      this.renderer.removeClass(sideMenu, 'mobileMenu');
    }
  }

  onCloseMenuClick() {
    const sideMenu = document.getElementById('sideMenu');
    if (sideMenu?.classList.contains('mobileMenu')) {
      this.renderer.removeClass(sideMenu, 'mobileMenu');
    }
  }

  settingtoggleSubmenu(event: Event): void {
    event.preventDefault();
    this.isSubmenuOpen = !this.isSubmenuOpen;
  }
}

// src/app/features/videos/videos.component.ts
import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  OnDestroy,
  Renderer2,
  Injectable
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

// Import the new service and its interfaces
import { VideosService, VideoItem }  from '../../core/services/videos.service';
import { AuthService } from '../../core/services/auth.service';
import { CryptoProvider } from '../../core/services/crypto.service';

// --- Mockup of ToastrService (for error/success messages) ---
// Since the original component used console.log for success/error, 
// a mock service is added to centralize messaging, which you can replace later.
@Injectable({ providedIn: 'root' })
class ToastrServiceMock {
  success(message: string): void { console.log('SUCCESS:', message); }
  error(message: string): void { console.error('ERROR:', message); }
}

@Component({
  selector: 'app-videos',
  standalone: true,
  // Ensure the service is available to the component, if not provided in root
  imports: [CommonModule, HttpClientModule],
  templateUrl: './videos.component.html',
  styleUrls: ['./videos.component.scss'],
  providers: [VideosService, ToastrServiceMock]
})
export class VideosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  faqsList: VideoItem[] = [];

  selectedId: string | null = null;
  isSubmenuOpen = false;

  // UI state
  loading = false;
  error: string | null = null;
  
  // The current user object for context (kept for auth/data context)
  currentUser: any; 

  constructor(
    private renderer: Renderer2,
    private sanitizer: DomSanitizer,
    private auth: AuthService,
    private router: Router,
    private crypto: CryptoProvider,
    private videosService: VideosService, // Inject the new service
    private toastr: ToastrServiceMock // Inject the mock toastr
  ) {
    // Keep synchronous user info loading here for immediate auth checks
    const rawAuthUser = localStorage.getItem('authUser');
    this.currentUser = rawAuthUser ? this.crypto.decryptObj(rawAuthUser) : null;
    console.log("Video: user ", this.currentUser);
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

    // Fetch from API
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

  /** === API fetch (via Service) === */
// src/app/features/videos/videos.component.ts

// ... (existing code)

  /** === API fetch (via Service) === */
  private fetchVideosFromApi(): void {
    this.loading = true;
    this.error = null;

    this.videosService.getVideos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          this.faqsList = items;
          this.loading = false;
        },
        error: (err) => {
          console.error('Component Failed to load videos', err);
          
          // 1. Assign the error message (it can be string or null)
          this.error = err?.error?.message || 'Failed to load videos. Please try again.';
          
          this.loading = false;
          
          // 2. Add a check to ensure this.error is not null before calling toastr.error
          if (this.error) {
             this.toastr.error(this.error);
          }
        },
      });
  }

// ... (rest of the component code)

  /** Add Video (via Service) */
  handleAddVideo(): void {
    const titleInput = document.getElementById('addTitle') as HTMLInputElement;
    const urlInput = document.getElementById('addUrl') as HTMLInputElement;

    const title = titleInput?.value?.trim();
    const rawUrl = urlInput?.value?.trim();

    if (!title || !rawUrl) {
        this.toastr.error('Please enter both title and URL.');
        return;
    }

    this.videosService.addVideo(title, rawUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newVideo) => {
          // Prepend the newly created video using server data
          this.faqsList = [newVideo, ...this.faqsList];
          
          // reset form + close modal
          titleInput.value = '';
          urlInput.value = '';
          this.closeModal('addFaqModal');
          this.toastr.success('Video added successfully.');
        },
        error: (err) => {
          console.error('Failed to add video', err);
          this.toastr.error(err?.error?.message || 'Failed to add video.');
        },
      });
  }


  /** Edit Video -> open modal */
  onEditVideo(video: VideoItem): void {
    this.selectedId = video._id;
    // NOTE: Use the rawUrl stored in the service's map function for clean editing
    (document.getElementById('editTitle') as HTMLInputElement).value = video.title;
    (document.getElementById('editUrl') as HTMLInputElement).value = video.rawUrl || video.url; // Use rawUrl if available
    this.openModal('editFaqModal');
  }

  /** Save changes -> PUT /video?id=<selectedId> (via Service) */
  handleEditVideo(): void {
    const title = (document.getElementById('editTitle') as HTMLInputElement).value?.trim();
    const rawUrl = (document.getElementById('editUrl') as HTMLInputElement).value?.trim();
    
    if (!this.selectedId || !title || !rawUrl) {
      this.closeModal('editFaqModal');
      return;
    }
    
    const current = this.faqsList.find(v => v._id === this.selectedId);
    if (!current?.userId) {
        this.toastr.error('Could not find user context for update.');
        return;
    }

    this.videosService.updateVideo(this.selectedId, title, rawUrl, current.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedVideo) => {
          // Update local list with server-confirmed values
          this.faqsList = this.faqsList.map((v) =>
            v._id === updatedVideo._id ? updatedVideo : v
          );
          this.closeModal('editFaqModal');
          this.toastr.success('Video updated successfully.');
        },
        error: (err) => {
          console.error('Failed to update video', err);
          this.toastr.error(err?.error?.message || 'Failed to update video.');
          // revert optimistic update if desired or just re-fetch
          this.fetchVideosFromApi(); 
          this.closeModal('editFaqModal');
        },
      });
  }

  /** Delete Video (via Service) */
  onDeleteVideo(): void {
    if (!this.selectedId) return;

    this.videosService.deleteVideo(this.selectedId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // remove locally after successful delete
          this.faqsList = this.faqsList.filter(v => v._id !== this.selectedId);
          this.selectedId = null;
          this.closeModal('editFaqModal');
          this.toastr.success('Video deleted successfully.');
        },
        error: (err) => {
          console.error('Failed to delete video', err);
          this.toastr.error(err?.error?.message || 'Failed to delete video.');
          this.closeModal('editFaqModal');
        }
      });
  }

  /** Helpers (unchanged, but use service for sanitation logic if needed elsewhere) */
  trackById = (_: number, v: VideoItem) => v._id;

  formatDate(date: any): string {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  // Sanitization must stay in the component where DomSanitizer is available
  sanitizeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  /** Modal handling (unchanged) */
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

  /** Sidebar handling (unchanged) */
  onMenuClick() {
    // ... (logic remains)
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
    // ... (logic remains)
    const innerArea = document.getElementById('clickToCloseArea');
    const sideMenu = document.getElementById('sideMenu');
    if (innerArea?.classList.contains('openedSideBar')) {
      this.renderer.removeClass(innerArea, 'openedSideBar');
      this.renderer.removeClass(sideMenu, 'mobileMenu');
    }
  }

  onCloseMenuClick() {
    // ... (logic remains)
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
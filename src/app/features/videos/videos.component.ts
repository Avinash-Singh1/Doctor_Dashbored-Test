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

@Component({
  selector: 'app-videos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './videos.component.html',
  styleUrls: ['./videos.component.scss'],
})
export class VideosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  faqsList: any[] = [];
  selectedId: string | null = null;
  isSubmenuOpen = false;

  constructor(
    private renderer: Renderer2,
    private sanitizer: DomSanitizer,
    private auth: AuthService,
    private router: Router // add router to redirect
  ) {}

  ngOnInit(): void {
    // 1) immediate synchronous check
    if (!this.auth.hasValidToken()) {
      if (typeof this.auth.clearToken === 'function') {
        this.auth.clearToken();
      }
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

    // existing behavior
    this.loadVideos();
  }

  private onStorageEvent = (ev: StorageEvent) => {
    const relevantKeys = ['authToken', 'authUser', 'deviceId'];
    if (ev.key === null || relevantKeys.includes(ev.key)) {
      if (!this.auth.hasValidToken()) {
        if (typeof this.auth.clearToken === 'function') {
          this.auth.clearToken();
        }
        if (!this.router.url.startsWith('/auth/login')) {
          this.router.navigate(['/auth/login']);
        }
      }
    }
  };

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('storage', this.onStorageEvent);
  }

  /** Load Hardcoded Videos */
  loadVideos(): void {
    this.faqsList = [
      {
        _id: '1',
        title: 'Angular Tutorial',
        url: 'https://www.youtube.com/embed/k5E2AVpwsko',
        createdAt: '2023-12-21',
      },
      {
        _id: '2',
        title: 'TypeScript Crash Course',
        url: 'https://www.youtube.com/embed/BwuLxPH8IDs',
        createdAt: '2024-01-10',
      },
      {
        _id: '3',
        title: 'RxJS Deep Dive',
        url: 'https://www.youtube.com/embed/PhggNGsSQyg',
        createdAt: '2024-03-05',
      },
    ];
  }

  /** Add Video */
  handleAddVideo(): void {
    const titleInput = document.getElementById('addTitle') as HTMLInputElement;
    const urlInput = document.getElementById('addUrl') as HTMLInputElement;

    if (titleInput?.value && urlInput?.value) {
      this.faqsList.push({
        _id: (this.faqsList.length + 1).toString(),
        title: titleInput.value,
        url: urlInput.value.replace('watch?v=', 'embed/'),
        createdAt: new Date().toISOString(),
      });

      titleInput.value = '';
      urlInput.value = '';
      this.closeModal('addFaqModal');
    }
  }

  /** Edit Video */
  onEditVideo(video: any): void {
    this.selectedId = video._id;
    (document.getElementById('editTitle') as HTMLInputElement).value =
      video.title;
    (document.getElementById('editUrl') as HTMLInputElement).value = video.url;
    this.openModal('editFaqModal');
  }

  handleEditVideo(): void {
    const title = (document.getElementById('editTitle') as HTMLInputElement)
      .value;
    const url = (document.getElementById('editUrl') as HTMLInputElement).value;

    this.faqsList = this.faqsList.map((v) =>
      v._id === this.selectedId
        ? { ...v, title, url: url.replace('watch?v=', 'embed/') }
        : v
    );

    this.closeModal('editFaqModal');
  }

  /** Delete Video */
  onDeleteVideo(): void {
    if (this.selectedId) {
      this.faqsList = this.faqsList.filter((v) => v._id !== this.selectedId);
      this.closeModal('editFaqModal');
    }
  }

  /** Helpers */
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

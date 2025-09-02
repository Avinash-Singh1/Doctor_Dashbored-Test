import { Component, OnInit, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Review {
  _id: string;
  user: { fullName: string };
  feedback: string;
  feedbackLike?: boolean;
  totalPoint: number;
  createdAt: string;
  updatedAt?: string;
  doctorReply?: string;
}

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.scss'],
})
export class ReviewsComponent implements OnInit {
  searchText = '';
  sortByNewest = true;
  isDropdownOpen = false;
  isEdit = false;
  doctorReply = '';
  currentReview: Review | null = null;

  reviewList: Review[] = [];
  filteredReviews: Review[] = [];

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews() {
    // 🔹 Hardcoded reviews for demo (replace with API in real use)
    this.reviewList = [
      {
        _id: 'r1',
        user: { fullName: 'John Doe' },
        feedback: 'Great experience with the doctor!',
        totalPoint: 4.5,
        createdAt: '2024-01-20T10:30:00',
        doctorReply: 'Thank you for your kind words!',
        updatedAt: '2024-01-21T09:00:00',
      },
      {
        _id: 'r2',
        user: { fullName: 'Jane Smith' },
        feedback: 'Very professional and helpful.',
        totalPoint: 5,
        createdAt: '2024-02-10T15:45:00',
      },
    ];
    this.filterAndSortReviews();
  }

  filterAndSortReviews() {
    this.filteredReviews = this.reviewList.filter((r) =>
      r.user.fullName.toLowerCase().includes(this.searchText.toLowerCase())
    );
    this.applySorting();
  }

  applySorting() {
    this.filteredReviews.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return this.sortByNewest ? dateB - dateA : dateA - dateB;
    });
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  sortNewestToOldest() {
    this.sortByNewest = true;
    this.applySorting();
    this.isDropdownOpen = false;
  }

  sortOldestToNewest() {
    this.sortByNewest = false;
    this.applySorting();
    this.isDropdownOpen = false;
  }

  likeFeedback(review: Review) {
    review.feedbackLike = !review.feedbackLike;
  }

  openReply(review: Review) {
    this.currentReview = review;
    this.doctorReply = '';
    this.isEdit = false;
  }

  edit(review: Review) {
    this.currentReview = review;
    this.doctorReply = review.doctorReply || '';
    this.isEdit = true;
  }

  closeReply() {
    this.currentReview = null;
    this.isEdit = false;
  }

  sendReview() {
    if (this.currentReview) {
      this.currentReview.doctorReply = this.doctorReply;
      this.currentReview.updatedAt = new Date().toISOString();
      this.doctorReply = '';
      this.isEdit = false;
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  }

  getStarRatings(totalPoint: number) {
    const fullStars = Math.floor(totalPoint);
    const halfStar = totalPoint % 1 >= 0.5 ? 1 : 0;
    const emptyStars = 5 - (fullStars + halfStar);
    return { fullStars, halfStar, emptyStars };
  }
}

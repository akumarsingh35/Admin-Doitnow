import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { Subject, firstValueFrom } from 'rxjs';

import {
  AdminBookingService,
  Booking,
  BookingStatus,
} from '../../services/admin-booking.service';
import { ApproveBookingModalComponent } from './modals/approve-booking-modal.component';
import { CancelBookingModalComponent } from './modals/cancel-booking-modal.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage implements OnInit, OnDestroy {
  readonly title = 'Bookings';
  readonly statusOptions: Array<{ value: BookingStatus; label: string }> = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED_BY_ADMIN', label: 'Cancelled (Admin)' },
    { value: 'CANCELLED_BY_USER', label: 'Cancelled (User)' },
  ];

  /** Action sheet shown when picking status — avoids horizontal tab clipping inside scroll views. */
  readonly statusSelectInterfaceOptions = {
    header: 'Filter by status',
    subHeader: 'Choose which bookings to show',
  };
  readonly statusLabel: Record<BookingStatus, string> = {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    COMPLETED: 'Completed',
    CANCELLED_BY_ADMIN: 'Cancelled (Admin)',
    CANCELLED_BY_USER: 'Cancelled (User)',
  };

  status: BookingStatus = 'PENDING';
  searchTerm = '';

  bookings: Booking[] = [];
  total = 0;
  totalPages = 0;
  currentPage = 1;

  isLoading = false;
  loadError?: string;
  hasMore = true;

  private page = 1;
  private readonly limit = 10;
  private readonly destroyed$ = new Subject<void>();

  constructor(
    private readonly adminBookingService: AdminBookingService,
    private readonly modalController: ModalController,
    private readonly toastController: ToastController,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    void this.resetAndLoad();
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  trackByBookingId(index: number, booking: Booking): string {
    return booking.id ?? String(index);
  }

  getStatusColor(status: BookingStatus): string {
    switch (status) {
      case 'PENDING':
        return 'warning';
      case 'CONFIRMED':
        return 'primary';
      case 'COMPLETED':
        return 'success';
      case 'CANCELLED_BY_ADMIN':
      case 'CANCELLED_BY_USER':
        return 'danger';
      default:
        return 'medium';
    }
  }

  async onStatusChange(value: BookingStatus): Promise<void> {
    this.status = value;
    await this.resetAndLoad();
  }

  async nextPage(): Promise<void> {
    if (this.currentPage < this.totalPages && !this.isLoading) {
      this.page = this.currentPage + 1;
      await this.loadMore();
    }
  }

  async previousPage(): Promise<void> {
    if (this.currentPage > 1 && !this.isLoading) {
      this.page = this.currentPage - 1;
      this.bookings = [];
      await this.loadMore();
    }
  }

  async refresh(event: CustomEvent): Promise<void> {
    await this.resetAndLoad();
    (event.target as any)?.complete?.();
  }

  async loadMore(event?: CustomEvent): Promise<void> {
    if (this.isLoading || !this.hasMore) {
      (event?.target as any)?.complete?.();
      return;
    }

    this.isLoading = true;
    this.loadError = undefined;

    try {
      const response = await firstValueFrom(
        this.adminBookingService.getBookings(
          this.page,
          this.limit,
          this.status,
        ),
      );

      this.total = response.meta.total;
      this.totalPages = response.meta.totalPages;
      this.currentPage = this.page;
      this.bookings = [...this.bookings, ...response.data];
      this.page = this.currentPage + 1;
      this.hasMore = this.page <= response.meta.totalPages;
    } catch (error) {
      this.loadError = (error as { message?: string })?.message ?? 'Failed to load bookings.';
      this.hasMore = false;
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
      (event?.target as any)?.complete?.();
    }
  }

  async openApprove(booking: Booking): Promise<void> {
    const modal = await this.modalController.create({
      component: ApproveBookingModalComponent,
      componentProps: { booking },
      breakpoints: [0, 0.6, 0.9],
      initialBreakpoint: 0.9,
    });

    await modal.present();
    const result = await modal.onDidDismiss<{ approved?: boolean }>();

    if (result.data?.approved) {
      await this.presentToast('Booking approved.');
      await this.resetAndLoad();
    }
  }

  async openCancel(booking: Booking): Promise<void> {
    const modal = await this.modalController.create({
      component: CancelBookingModalComponent,
      componentProps: { booking },
      breakpoints: [0, 0.6, 0.9],
      initialBreakpoint: 0.9,
    });

    await modal.present();
    const result = await modal.onDidDismiss<{ cancelled?: boolean }>();

    if (result.data?.cancelled) {
      await this.presentToast('Booking cancelled.');
      await this.resetAndLoad();
    }
  }

  async resetAndLoad(): Promise<void> {
    this.page = 1;
    this.currentPage = 1;
    this.bookings = [];
    this.total = 0;
    this.totalPages = 0;
    this.hasMore = true;
    this.loadError = undefined;
    await this.loadMore();
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1800,
      position: 'bottom',
    });
    await toast.present();
  }

}

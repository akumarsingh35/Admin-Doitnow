import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { firstValueFrom, Subject } from 'rxjs';

import {
  AdminBookingService,
  Booking,
  BookingStatus,
  bookingHttpErrorMessage,
} from '../../services/admin-booking.service';
import { ApproveBookingModalComponent } from './modals/approve-booking-modal.component';
import { CancelBookingModalComponent } from './modals/cancel-booking-modal.component';

@Component({
  selector: 'app-requests',
  templateUrl: './requests.page.html',
  styleUrls: ['./requests.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestsPage implements OnInit, OnDestroy {
  readonly title = 'Requests';
  readonly statusOptions: Array<{ value: BookingStatus; label: string }> = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED_BY_ADMIN', label: 'Cancelled (Admin)' },
    { value: 'CANCELLED_BY_USER', label: 'Cancelled (User)' },
  ];
  readonly statusSelectInterfaceOptions = {
    header: 'Filter by status',
    subHeader: 'Show requests in this state',
  };

  status: BookingStatus = 'PENDING';
  bookings: Booking[] = [];
  total = 0;
  totalPages = 0;
  currentPage = 1;
  isLoading = false;
  loadError?: string;
  hasMore = true;
  /** Prevents double-submit while completing a booking from the list. */
  completingBookingId: string | null = null;
  private page = 1;
  private readonly limit = 10;
  private readonly destroyed$ = new Subject<void>();

  constructor(
    private readonly adminBookingService: AdminBookingService,
    private readonly alertController: AlertController,
    private readonly modalController: ModalController,
    private readonly toastController: ToastController,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
  ) {}

  /** Pass booking in navigation state so detail works when single-item GET is unavailable. */
  goToDetail(booking: Booking, event?: Event): void {
    event?.stopPropagation();
    void this.router.navigate(['/requests', booking.id], { state: { booking } });
  }

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

  requestSchedule(booking: Booking): string {
    const d = booking.date?.trim() || '—';
    const t = booking.timeSlot?.trim() || '—';
    return `${d} · ${t}`;
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
    (event.target as { complete?: () => void } | null)?.complete?.();
  }

  async loadMore(event?: CustomEvent): Promise<void> {
    if (this.isLoading || !this.hasMore) {
      (event?.target as { complete?: () => void } | null)?.complete?.();
      return;
    }

    this.isLoading = true;
    this.loadError = undefined;

    try {
      const response = await firstValueFrom(
        this.adminBookingService.getBookings(this.page, this.limit, this.status),
      );
      this.total = response.meta.total;
      this.totalPages = response.meta.totalPages;
      this.currentPage = this.page;
      this.bookings = [...this.bookings, ...response.data];
      this.page = this.currentPage + 1;
      this.hasMore = this.page <= response.meta.totalPages;
    } catch (error) {
      this.loadError = (error as { message?: string })?.message ?? 'Failed to load requests.';
      this.hasMore = false;
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
      (event?.target as { complete?: () => void } | null)?.complete?.();
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
      await this.presentToast('Request approved.');
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
      await this.presentToast('Request rejected.');
      await this.resetAndLoad();
    }
  }

  async confirmComplete(booking: Booking, event?: Event): Promise<void> {
    event?.stopPropagation();
    if (booking.status !== 'CONFIRMED' || this.completingBookingId) {
      return;
    }
    const alert = await this.alertController.create({
      header: 'Mark as completed',
      message:
        'Use this only after the partner has finished the service. ' +
        'The booking will be set to Completed.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Mark completed',
          role: 'confirm',
          handler: () => {
            void this.runCompleteFromList(booking);
          },
        },
      ],
    });
    await alert.present();
  }

  private async runCompleteFromList(booking: Booking): Promise<void> {
    this.completingBookingId = booking.id;
    this.cdr.markForCheck();
    try {
      await firstValueFrom(this.adminBookingService.completeBooking(booking.id));
      await this.presentToast('Request marked as completed.');
      await this.resetAndLoad();
    } catch (e) {
      await this.presentToast(
        bookingHttpErrorMessage(e, 'Could not mark as completed. Please try again.'),
      );
    } finally {
      this.completingBookingId = null;
      this.cdr.markForCheck();
    }
  }

  isCompleting(booking: Booking): boolean {
    return this.completingBookingId === booking.id;
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

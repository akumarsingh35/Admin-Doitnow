import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import {
  AdminBookingService,
  Booking,
  BookingStatus,
  bookingHttpErrorMessage,
} from '../../services/admin-booking.service';
import { ApproveBookingModalComponent } from './modals/approve-booking-modal.component';
import { CancelBookingModalComponent } from './modals/cancel-booking-modal.component';

/** Local demo data when a single-item GET is unavailable. */
const MOCK_EXTRA: Readonly<
  Record<string, { dog?: { size: string; behavior: string }; instructions: string }>
> = {
  '1245': {
    dog: { size: 'Large', behavior: 'Friendly' },
    instructions: 'Walk slowly, dog is old',
  },
  '1246': {
    instructions: 'Deep clean living room and kitchen. Tenant may be home.',
  },
};

@Component({
  selector: 'app-request-detail',
  templateUrl: './request-detail.page.html',
  styleUrls: ['./request-detail.page.scss'],
  standalone: false,
})
export class RequestDetailPage implements OnInit {
  id = '';
  booking: Booking | null = null;
  isLoading = true;
  completing = false;
  loadError?: string;
  extra?: { dog?: { size: string; behavior: string }; instructions: string };

  /** Set when list navigates with `{ state: { booking } }` (see Router.getCurrentNavigation). */
  private readonly bookingFromNav?: Booking;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly alertController: AlertController,
    private readonly toastController: ToastController,
    private readonly adminBookingService: AdminBookingService,
    private readonly modalController: ModalController,
  ) {
    const nav = this.router.getCurrentNavigation();
    const s = nav?.extras?.state as { booking?: Booking } | undefined;
    if (s?.booking?.id) {
      this.bookingFromNav = s.booking;
    }
  }

  async ngOnInit(): Promise<void> {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    this.extra = MOCK_EXTRA[this.id];
    await this.load();
  }

  private async load(): Promise<void> {
    this.isLoading = true;
    this.loadError = undefined;
    const fallback = this.resolveFallbackBooking();
    this.booking = fallback ?? null;
    try {
      this.booking = await firstValueFrom(this.adminBookingService.getBookingById(this.id));
    } catch {
      if (fallback) {
        this.booking = fallback;
        this.loadError = undefined;
      } else {
        this.booking = null;
        this.loadError = 'Could not load this request from the server.';
      }
    } finally {
      this.isLoading = false;
    }
  }

  /** Same booking the user opened from the list, or from browser history (lazy routes). */
  private resolveFallbackBooking(): Booking | undefined {
    if (this.bookingFromNav?.id === this.id) {
      return this.bookingFromNav;
    }
    if (typeof history !== 'undefined' && history.state) {
      const st = history.state as { booking?: Booking };
      if (st.booking && st.booking.id === this.id) {
        return st.booking;
      }
    }
    return undefined;
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

  async onApprove(): Promise<void> {
    if (!this.booking) {
      return;
    }
    const modal = await this.modalController.create({
      component: ApproveBookingModalComponent,
      componentProps: { booking: this.booking },
      breakpoints: [0, 0.6, 0.9],
      initialBreakpoint: 0.9,
    });
    await modal.present();
    const { data } = await modal.onDidDismiss<{ approved?: boolean }>();
    if (data?.approved) {
      await this.presentToast('Request approved.');
      await this.router.navigateByUrl('/requests');
    }
  }

  async onReject(): Promise<void> {
    if (!this.booking) {
      return;
    }
    const modal = await this.modalController.create({
      component: CancelBookingModalComponent,
      componentProps: { booking: this.booking },
      breakpoints: [0, 0.6, 0.9],
      initialBreakpoint: 0.9,
    });
    await modal.present();
    const { data } = await modal.onDidDismiss<{ cancelled?: boolean }>();
    if (data?.cancelled) {
      await this.presentToast('Request rejected.');
      await this.router.navigateByUrl('/requests');
    }
  }

  async onMarkComplete(): Promise<void> {
    if (!this.booking || this.booking.status !== 'CONFIRMED' || this.completing) {
      return;
    }
    const alert = await this.alertController.create({
      header: 'Mark as completed',
      message:
        'Use this only after the partner has finished the service. ' +
        'The booking will be set to Completed for the customer.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Mark completed',
          role: 'confirm',
          handler: () => {
            void this.runComplete();
          },
        },
      ],
    });
    await alert.present();
  }

  private async runComplete(): Promise<void> {
    if (!this.booking) {
      return;
    }
    this.completing = true;
    try {
      const updated = await firstValueFrom(this.adminBookingService.completeBooking(this.booking.id));
      this.booking = updated;
      await this.presentToast('Request marked as completed.');
    } catch (e) {
      await this.presentToast(
        bookingHttpErrorMessage(e, 'Could not mark as completed. Please try again.'),
      );
    } finally {
      this.completing = false;
    }
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
    });
    await toast.present();
  }
}

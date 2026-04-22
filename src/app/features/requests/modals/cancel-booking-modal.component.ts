import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { AdminBookingService, Booking } from '../../../services/admin-booking.service';

type Step = 'reason' | 'confirm';

@Component({
  selector: 'app-cancel-booking-modal',
  templateUrl: './cancel-booking-modal.component.html',
  styleUrls: ['./cancel-booking-modal.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CancelBookingModalComponent {
  @Input({ required: true }) booking!: Booking;

  step: Step = 'reason';
  reason = '';
  isSubmitting = false;

  constructor(
    private readonly adminBookingService: AdminBookingService,
    private readonly modalController: ModalController,
    private readonly toastController: ToastController,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  back(): void {
    if (this.step === 'confirm') {
      this.step = 'reason';
      return;
    }
    void this.dismiss();
  }

  next(): void {
    if (!this.reason.trim()) {
      void this.presentToast('Reason is required.');
      return;
    }
    this.step = 'confirm';
  }

  async cancel(): Promise<void> {
    const reason = this.reason.trim();
    if (!reason) {
      await this.presentToast('Reason is required.');
      return;
    }

    this.isSubmitting = true;
    this.cdr.markForCheck();

    try {
      await firstValueFrom(this.adminBookingService.rejectBooking(this.booking.id, reason));
      await this.dismiss({ cancelled: true });
    } catch (error) {
      const message = (error as { message?: string })?.message ?? 'Failed to reject request.';
      await this.presentToast(message);
    } finally {
      this.isSubmitting = false;
      this.cdr.markForCheck();
    }
  }

  async dismiss(data?: unknown): Promise<void> {
    await this.modalController.dismiss(data);
  }

  bookingCustomerPhone(): string {
    return this.booking.user?.phone || '—';
  }

  bookingAddressText(): string {
    return this.booking.address?.fullAddress || '—';
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


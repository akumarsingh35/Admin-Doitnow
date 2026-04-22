import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { Subject, debounceTime, distinctUntilChanged, firstValueFrom, takeUntil } from 'rxjs';

import { AdminBookingService, Booking } from '../../../services/admin-booking.service';
import {
  AdminPartner,
  AdminPartnerService,
  firstAddressLine,
  serviceTitles,
} from '../../../services/admin-partner.service';

type Step = 'select_partner' | 'confirm';

@Component({
  selector: 'app-approve-booking-modal',
  templateUrl: './approve-booking-modal.component.html',
  styleUrls: ['./approve-booking-modal.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApproveBookingModalComponent implements OnInit, OnDestroy {
  @Input({ required: true }) booking!: Booking;

  step: Step = 'select_partner';

  partnerSearchTerm = '';
  partners: AdminPartner[] = [];
  selectedPartner?: AdminPartner;

  isLoadingPartners = false;
  partnersHasMore = false;

  isSubmitting = false;

  private readonly searchChanged$ = new Subject<string>();
  private readonly destroyed$ = new Subject<void>();

  constructor(
    private readonly adminBookingService: AdminBookingService,
    private readonly adminPartnerService: AdminPartnerService,
    private readonly modalController: ModalController,
    private readonly toastController: ToastController,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.searchChanged$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroyed$))
      .subscribe(() => {
        void this.loadPartnersFromApi();
      });

    void this.loadPartnersFromApi();
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  onSearchChange(value: string): void {
    this.partnerSearchTerm = value;
    this.searchChanged$.next(value);
  }

  trackByPartnerId(index: number, partner: AdminPartner): string {
    return partner.id ?? String(index);
  }

  async loadMorePartners(event?: CustomEvent): Promise<void> {
    (event?.target as { complete?: () => void } | null)?.complete?.();
  }

  selectPartner(partner: AdminPartner): void {
    this.selectedPartner = partner;
    this.step = 'confirm';
  }

  addressLine(partner: AdminPartner): string {
    return firstAddressLine(partner);
  }

  serviceNames(partner: AdminPartner): string[] {
    return serviceTitles(partner);
  }

  back(): void {
    if (this.step === 'confirm') {
      this.step = 'select_partner';
      return;
    }
    void this.dismiss();
  }

  async approve(): Promise<void> {
    if (!this.selectedPartner) {
      await this.presentToast('Select a partner to approve.');
      return;
    }

    this.isSubmitting = true;
    this.cdr.markForCheck();

    try {
      await firstValueFrom(
        this.adminBookingService.approveBooking(this.booking.id, this.selectedPartner.id),
      );
      await this.dismiss({ approved: true });
    } catch (error) {
      const message = this.messageFromUnknown(error);
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

  private async loadPartnersFromApi(): Promise<void> {
    this.isLoadingPartners = true;
    this.cdr.markForCheck();

    try {
      this.partners = await this.adminPartnerService.searchPartners({
        search: this.partnerSearchTerm.trim() || undefined,
        serviceId: this.booking.service?.id ?? undefined,
        onlyActive: true,
      });
    } catch (e) {
      this.partners = [];
      const msg =
        e instanceof HttpErrorResponse && e.status === 401
          ? 'Session expired.'
          : 'Could not load partners.';
      await this.presentToast(msg);
    } finally {
      this.isLoadingPartners = false;
      this.cdr.markForCheck();
    }
  }

  private messageFromUnknown(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const b = error.error;
      if (b && typeof b === 'object' && 'message' in b) {
        return String((b as { message: string }).message);
      }
      if (typeof b === 'string' && b.trim()) {
        return b;
      }
    }
    return (error as { message?: string })?.message ?? 'Failed to approve request.';
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

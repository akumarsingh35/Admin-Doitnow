import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { Subject, debounceTime, distinctUntilChanged, firstValueFrom, takeUntil } from 'rxjs';

import { AdminBookingService, Booking } from '../../../services/admin-booking.service';
import { Partner, PartnerService } from '../../../services/partner.service';

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
  partners: Partner[] = [];
  selectedPartner?: Partner;

  isLoadingPartners = false;
  partnersHasMore = true;
  private partnersPage = 1;
  private readonly partnersLimit = 25;

  isSubmitting = false;

  private readonly searchChanged$ = new Subject<string>();
  private readonly destroyed$ = new Subject<void>();

  constructor(
    private readonly adminBookingService: AdminBookingService,
    private readonly partnerService: PartnerService,
    private readonly modalController: ModalController,
    private readonly toastController: ToastController,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.searchChanged$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroyed$))
      .subscribe((value) => {
        this.partnerSearchTerm = value;
        void this.resetPartnersAndLoad();
      });

    void this.resetPartnersAndLoad();
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  onSearchChange(value: string): void {
    this.searchChanged$.next(value);
  }

  trackByPartnerId(index: number, partner: Partner): string {
    return partner.id ?? String(index);
  }

  async loadMorePartners(event?: CustomEvent): Promise<void> {
    if (this.isLoadingPartners || !this.partnersHasMore) {
      (event?.target as any)?.complete?.();
      return;
    }

    this.isLoadingPartners = true;
    this.cdr.markForCheck();

    try {
      const response = await firstValueFrom(
        this.partnerService.listPartners({
          q: this.partnerSearchTerm.trim() || undefined,
          page: this.partnersPage,
          limit: this.partnersLimit,
        }),
      );

      this.partners = [...this.partners, ...response.items];
      this.partnersPage += 1;
      this.partnersHasMore = Boolean(response.hasMore);
    } catch {
      this.partnersHasMore = false;
      await this.presentToast('Failed to load partners.');
    } finally {
      this.isLoadingPartners = false;
      this.cdr.markForCheck();
      (event?.target as any)?.complete?.();
    }
  }

  selectPartner(partner: Partner): void {
    this.selectedPartner = partner;
    this.step = 'confirm';
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
      await firstValueFrom(this.adminBookingService.approveBooking(this.booking.id, this.selectedPartner.id));
      await this.dismiss({ approved: true });
    } catch (error) {
      const message = (error as { message?: string })?.message ?? 'Failed to approve booking.';
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

  private async resetPartnersAndLoad(): Promise<void> {
    this.partnersPage = 1;
    this.partners = [];
    this.partnersHasMore = true;
    await this.loadMorePartners();
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

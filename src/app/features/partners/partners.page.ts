import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import {
  AdminPartner,
  AdminPartnerService,
  firstAddressLine,
  serviceTitles,
} from '../../services/admin-partner.service';
import { PartnerFormModalComponent } from './modals/partner-form-modal.component';

@Component({
  selector: 'app-partners',
  templateUrl: './partners.page.html',
  styleUrls: ['./partners.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnersPage implements OnInit, OnDestroy {
  readonly title = 'Partners Management';

  readonly lead =
    'Create, edit, and search field partners. Lists and search use the same API as booking assignment.';

  /** Active-only vs active + inactive (GET /partners vs /partners/all). */
  listScope: 'active' | 'all' = 'active';

  partners: AdminPartner[] = [];
  loading = false;
  loadError?: string;

  private searchQuery = '';
  private readonly searchChanged$ = new Subject<string>();
  private readonly destroyed$ = new Subject<void>();

  constructor(
    private readonly adminPartnerService: AdminPartnerService,
    private readonly modalController: ModalController,
    private readonly alertController: AlertController,
    private readonly toastController: ToastController,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.searchChanged$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroyed$))
      .subscribe(() => {
        void this.loadPartners();
      });

    void this.loadPartners();
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  get stats(): Array<{ label: string; value: string; hint: string; tone: 'a' | 'b' | 'c' }> {
    const count = this.partners.length;
    const active = this.partners.filter((p) => p.isActive).length;
    const openJobs = this.partners.reduce((s, p) => s + (p.activeApprovedBookingCount ?? 0), 0);
    return [
      { label: 'Listed', value: String(count), hint: this.listScope === 'all' ? 'In view' : 'Active only', tone: 'a' },
      { label: 'Active', value: String(active), hint: 'Profiles on', tone: 'b' },
      { label: 'Open jobs', value: String(openJobs), hint: 'Approved in progress', tone: 'c' },
    ];
  }

  onPartnerSearch(value: string | null | undefined): void {
    this.searchQuery = String(value ?? '');
    this.searchChanged$.next(this.searchQuery);
  }

  onScopeChange(value: 'active' | 'all' | null): void {
    if (value !== 'active' && value !== 'all') {
      return;
    }
    if (this.listScope === value) {
      return;
    }
    this.listScope = value;
    void this.loadPartners();
  }

  trackByPartnerId(_index: number, p: AdminPartner): string {
    return p.id;
  }

  addressLine(partner: AdminPartner): string {
    return firstAddressLine(partner);
  }

  serviceTitleList(partner: AdminPartner): string[] {
    return serviceTitles(partner);
  }

  async openCreate(): Promise<void> {
    const modal = await this.modalController.create({
      component: PartnerFormModalComponent,
      componentProps: { mode: 'create' },
      breakpoints: [0, 0.95],
      initialBreakpoint: 0.95,
    });
    await modal.present();
    const { data } = await modal.onWillDismiss<{ saved?: boolean }>();
    if (data?.saved) {
      await this.loadPartners();
    }
  }

  async openEdit(partner: AdminPartner, event?: Event): Promise<void> {
    event?.stopPropagation();
    const modal = await this.modalController.create({
      component: PartnerFormModalComponent,
      componentProps: { mode: 'edit', partnerId: partner.id },
      breakpoints: [0, 0.95],
      initialBreakpoint: 0.95,
    });
    await modal.present();
    const { data } = await modal.onWillDismiss<{ saved?: boolean }>();
    if (data?.saved) {
      await this.loadPartners();
    }
  }

  async confirmDelete(partner: AdminPartner, event?: Event): Promise<void> {
    event?.stopPropagation();
    const alert = await this.alertController.create({
      header: 'Remove partner?',
      message: `“${partner.fullName}” will be marked inactive and unmapped. This is not allowed if they have active approved bookings.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove',
          role: 'destructive',
          handler: () => {
            void this.runDelete(partner);
          },
        },
      ],
    });
    await alert.present();
  }

  private async runDelete(partner: AdminPartner): Promise<void> {
    try {
      await this.adminPartnerService.deletePartner(partner.id);
      await this.presentToast('Partner removed.');
      await this.loadPartners();
    } catch (e) {
      const msg = this.readHttpMessage(
        e,
        'Could not remove partner. They may have active approved bookings.',
      );
      await this.presentToast(msg);
    }
  }

  async onRefresh(event: CustomEvent): Promise<void> {
    try {
      await this.loadPartners();
    } finally {
      (event.target as { complete?: () => void } | null)?.complete?.();
    }
  }

  private async loadPartners(): Promise<void> {
    this.loading = true;
    this.loadError = undefined;
    this.cdr.markForCheck();

    const q = { search: this.searchQuery.trim() || undefined };

    try {
      if (this.listScope === 'all') {
        this.partners = await this.adminPartnerService.listAllPartners(q);
      } else {
        this.partners = await this.adminPartnerService.listPartners(q);
      }
    } catch (e) {
      this.partners = [];
      if (e instanceof HttpErrorResponse && e.status === 401) {
        this.loadError = 'Session expired. Sign in again.';
      } else {
        this.loadError = 'Could not load partners.';
      }
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  private readHttpMessage(e: unknown, fallback: string): string {
    if (e instanceof HttpErrorResponse) {
      const body = e.error;
      if (body && typeof body === 'object' && 'message' in body) {
        return String((body as { message: string }).message);
      }
      if (typeof body === 'string' && body.trim()) {
        return body;
      }
    }
    return fallback;
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2200,
      position: 'bottom',
    });
    await toast.present();
  }
}

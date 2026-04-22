import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import {
  AdminPartner,
  AdminPartnerService,
  CreatePartnerDto,
  PartnerAddressInput,
} from '../../../services/admin-partner.service';
import { AdminServiceService, getCatalogServiceId } from '../../../services/admin-service.service';

@Component({
  selector: 'app-partner-form-modal',
  templateUrl: './partner-form-modal.component.html',
  styleUrls: ['./partner-form-modal.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnerFormModalComponent implements OnInit {
  @Input({ required: true }) mode!: 'create' | 'edit';
  @Input() partnerId?: string;

  form!: FormGroup;
  /** Catalog rows: `serviceId` is the only value sent to the API (never `title`). */
  servicesOptions: Array<{ serviceId: string; title: string }> = [];
  loadingServices = false;
  loadingPartner = false;
  saving = false;
  loadError?: string;

  constructor(
    private readonly fb: FormBuilder,
    private readonly adminPartnerService: AdminPartnerService,
    private readonly adminServiceService: AdminServiceService,
    private readonly modalController: ModalController,
    private readonly toastController: ToastController,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      fullName: ['', [Validators.required]],
      phone: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      isActive: [true],
      label: [''],
      fullAddress: [''],
      city: [''],
      state: [''],
      pincode: [''],
      serviceIds: [[] as string[]],
    });

    void this.loadServiceCatalog();
    if (this.mode === 'edit' && this.partnerId) {
      void this.loadPartner(this.partnerId);
    }
  }

  get headerLabel(): string {
    return this.mode === 'create' ? 'Add partner' : 'Edit partner';
  }

  trackByServiceId(_index: number, s: { serviceId: string; title: string }): string {
    return s.serviceId;
  }

  isServiceSelected(serviceId: string): boolean {
    if (!serviceId) {
      return false;
    }
    const ids: string[] = this.form?.get('serviceIds')?.value ?? [];
    return ids.includes(serviceId);
  }

  toggleService(serviceId: string, ev: CustomEvent): void {
    if (!serviceId) {
      return;
    }
    const checked = !!(ev as CustomEvent & { detail?: { checked?: boolean } }).detail?.checked;
    const control = this.form.get('serviceIds');
    const cur: string[] = [...(control?.value ?? [])];
    if (checked) {
      if (!cur.includes(serviceId)) {
        cur.push(serviceId);
      }
    } else {
      const i = cur.indexOf(serviceId);
      if (i >= 0) {
        cur.splice(i, 1);
      }
    }
    control?.setValue(cur);
    this.cdr.markForCheck();
  }

  async dismiss(saved = false): Promise<void> {
    await this.modalController.dismiss({ saved });
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const address = this.buildAddressPayload(v);

    const rawIds = (v.serviceIds as string[] | null | undefined) ?? [];
    const serviceIds = rawIds
      .map((x) => (typeof x === 'string' ? x.trim() : ''))
      .filter((id) => id.length > 0);

    const base: CreatePartnerDto = {
      fullName: v.fullName.trim(),
      phone: v.phone.trim(),
      email: v.email.trim(),
      serviceIds,
      address,
    };

    if (this.mode === 'edit') {
      base.isActive = !!v.isActive;
    }

    this.saving = true;
    this.cdr.markForCheck();

    try {
      if (this.mode === 'create') {
        await this.adminPartnerService.createPartner(base);
      } else if (this.partnerId) {
        await this.adminPartnerService.updatePartner(this.partnerId, base);
      }
      await this.presentToast(this.mode === 'create' ? 'Partner created.' : 'Partner updated.');
      await this.dismiss(true);
    } catch (e: unknown) {
      const msg = this.readErrorMessage(e, 'Could not save partner.');
      await this.presentToast(msg);
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }

  private buildAddressPayload(v: Record<string, unknown>): PartnerAddressInput {
    const out: PartnerAddressInput = {};
    const str = (k: string) => {
      const s = v[k];
      if (typeof s !== 'string') {
        return undefined;
      }
      const t = s.trim();
      return t.length ? t : undefined;
    };

    const label = str('label');
    const fullAddress = str('fullAddress');
    const city = str('city');
    const state = str('state');
    const pincode = str('pincode');
    if (label) {
      out.label = label;
    }
    if (fullAddress) {
      out.fullAddress = fullAddress;
    }
    if (city) {
      out.city = city;
    }
    if (state) {
      out.state = state;
    }
    if (pincode) {
      out.pincode = pincode;
    }
    return out;
  }

  private async loadServiceCatalog(): Promise<void> {
    this.loadingServices = true;
    this.cdr.markForCheck();
    try {
      const res = await this.adminServiceService.getServices();
      this.servicesOptions = (res.data ?? [])
        .map((s) => {
          const serviceId = getCatalogServiceId(s);
          return { serviceId, title: s.title };
        })
        .filter((row) => row.serviceId.length > 0);
    } catch {
      this.servicesOptions = [];
      this.loadError = 'Could not load services catalog.';
    } finally {
      this.loadingServices = false;
      this.cdr.markForCheck();
    }
  }

  private async loadPartner(id: string): Promise<void> {
    this.loadingPartner = true;
    this.cdr.markForCheck();
    try {
      const p = await this.adminPartnerService.getPartnerById(id);
      this.patchFromPartner(p);
    } catch {
      this.loadError = 'Could not load partner.';
    } finally {
      this.loadingPartner = false;
      this.cdr.markForCheck();
    }
  }

  private patchFromPartner(p: AdminPartner): void {
    const addr = p.addresses?.[0];
    const mappingIds = (p.services ?? [])
      .filter((m) => m.isActiveMapping !== false)
      .map((m) => m.serviceId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    this.form.patchValue({
      fullName: p.fullName,
      phone: p.phone,
      email: p.email,
      isActive: p.isActive,
      label: addr?.label ?? addr?.addressLabel ?? '',
      fullAddress: addr?.fullAddress ?? '',
      city: addr?.city ?? '',
      state: addr?.state ?? '',
      pincode: addr?.pincode ?? addr?.postalCode ?? '',
      serviceIds: mappingIds,
    });
  }

  private readErrorMessage(e: unknown, fallback: string): string {
    if (e instanceof HttpErrorResponse) {
      const b = e.error;
      if (b && typeof b === 'object' && 'message' in b) {
        return String((b as { message: string }).message);
      }
      if (typeof b === 'string' && b.trim()) {
        return b;
      }
    }
    return (e as { message?: string })?.message ?? fallback;
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

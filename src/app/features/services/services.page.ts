import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';

import {
  AdminService,
  AdminServiceService,
  CreateServicePayload,
  ServiceDisplayType,
  UpdateServicePayload,
} from '../../services/admin-service.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-services',
  templateUrl: './services.page.html',
  styleUrls: ['./services.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesPage implements OnInit {
  services: AdminService[] = [];
  loading = false;
  isModalOpen = false;
  isEditMode = false;
  selectedService: AdminService | null = null;

  form: FormGroup;
  isSubmitting = false;

  imageFile: File | null = null;
  iconFile: File | null = null;
  imagePreviewUrl: string | null = null;
  iconPreviewUrl: string | null = null;
  isDeletingImage = false;
  isDeletingIcon = false;

  readonly displayTypeOptions: Array<{ value: ServiceDisplayType; label: string }> = [
    { value: 'IMAGE', label: 'IMAGE' },
    { value: 'ICON', label: 'ICON' },
  ];

  constructor(
    private readonly adminServiceService: AdminServiceService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly alertController: AlertController,
    private readonly toastController: ToastController,
    private readonly fb: FormBuilder,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required]],
      subtitle: [''],
      description: [''],
      startingPrice: [null, [Validators.required]],
      currency: ['INR', [Validators.required]],
      imageUrl: [''],
      iconUrl: [''],
      displayType: ['IMAGE'],
      colorClass: [''],
      tag: [''],
      isPopular: [false],
    });
  }

  ngOnInit(): void {
    void this.loadServices();
  }

  async loadServices(): Promise<void> {
    if (this.loading) {
      return;
    }

    this.loading = true;
    this.cdr.markForCheck();

    try {
      const response = await this.adminServiceService.getServices();
      this.services = response.data ?? [];
    } catch (error) {
      await this.handleApiError(error);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  openAddModal(): void {
    if (this.isSubmitting) {
      return;
    }

    this.isEditMode = false;
    this.selectedService = null;
    this.clearMediaState();
    this.form.reset({
      title: '',
      subtitle: '',
      description: '',
      startingPrice: null,
      currency: 'INR',
      imageUrl: '',
      iconUrl: '',
      displayType: 'IMAGE',
      colorClass: '',
      tag: '',
      isPopular: false,
    });
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  openEditModal(service: AdminService): void {
    if (this.isSubmitting) {
      return;
    }

    this.isEditMode = true;
    this.selectedService = service;
    this.clearMediaState();
    this.form.reset({
      title: service.title ?? '',
      subtitle: service.subtitle ?? '',
      description: service.description ?? '',
      startingPrice: service.startingPrice ?? null,
      currency: service.currency ?? 'INR',
      imageUrl: service.imageUrl ?? '',
      iconUrl: service.iconUrl ?? '',
      displayType: service.displayType ?? 'IMAGE',
      colorClass: service.colorClass ?? '',
      tag: service.tag ?? '',
      isPopular: Boolean(service.isPopular),
    });
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  closeModal(): void {
    if (this.isSubmitting) {
      return;
    }

    this.isModalOpen = false;
    this.clearMediaState();
    this.cdr.markForCheck();
  }

  onSelectImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.imageFile = file;
    this.imagePreviewUrl = file ? URL.createObjectURL(file) : null;
    this.cdr.markForCheck();
  }

  onSelectIcon(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.iconFile = file;
    this.iconPreviewUrl = file ? URL.createObjectURL(file) : null;
    this.cdr.markForCheck();
  }

  async deleteExistingImage(): Promise<void> {
    const id = this.selectedService?.id;
    if (!this.isEditMode || !id || this.isDeletingImage || this.isSubmitting) {
      return;
    }

    this.isDeletingImage = true;
    this.cdr.markForCheck();

    try {
      await this.adminServiceService.deleteServiceImage(id);
      if (this.selectedService) {
        this.selectedService = { ...this.selectedService, imageUrl: null };
      }
      this.form.patchValue({ imageUrl: '' });
      await this.presentToast('Image deleted.');
    } catch (error) {
      await this.handleApiError(error);
    } finally {
      this.isDeletingImage = false;
      this.cdr.markForCheck();
    }
  }

  async deleteExistingIcon(): Promise<void> {
    const id = this.selectedService?.id;
    if (!this.isEditMode || !id || this.isDeletingIcon || this.isSubmitting) {
      return;
    }

    this.isDeletingIcon = true;
    this.cdr.markForCheck();

    try {
      await this.adminServiceService.deleteServiceIcon(id);
      if (this.selectedService) {
        this.selectedService = { ...this.selectedService, iconUrl: null };
      }
      this.form.patchValue({ iconUrl: '' });
      await this.presentToast('Icon deleted.');
    } catch (error) {
      await this.handleApiError(error);
    } finally {
      this.isDeletingIcon = false;
      this.cdr.markForCheck();
    }
  }

  async submit(): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      await this.presentToast('Please fill required fields.');
      return;
    }

    this.isSubmitting = true;
    this.cdr.markForCheck();

    try {
      const raw = this.form.getRawValue() as CreateServicePayload;
      const payload: CreateServicePayload = {
        title: String(raw.title ?? '').trim(),
        subtitle: String(raw.subtitle ?? '').trim() || undefined,
        description: String(raw.description ?? '').trim() || undefined,
        startingPrice: Number(raw.startingPrice),
        currency: String(raw.currency ?? 'INR'),
        imageUrl: String(raw.imageUrl ?? '').trim() || undefined,
        iconUrl: String(raw.iconUrl ?? '').trim() || undefined,
        displayType: raw.displayType || undefined,
        colorClass: String(raw.colorClass ?? '').trim() || undefined,
        tag: String(raw.tag ?? '').trim() || undefined,
        isPopular: Boolean(raw.isPopular),
      };

      if (!payload.title || Number.isNaN(payload.startingPrice)) {
        await this.presentToast('Please fill required fields.');
        return;
      }

      if (!this.isEditMode) {
        const created = (await this.adminServiceService.createService(payload)) as {
          message?: string;
          data?: { id?: string };
        };
        const createdId = created?.data?.id;
        if (createdId) {
          if (this.imageFile) {
            const img = await this.adminServiceService.uploadServiceImage(createdId, this.imageFile);
            this.form.patchValue({ imageUrl: img.data.imageUrl });
          }
          if (this.iconFile) {
            const ic = await this.adminServiceService.uploadServiceIcon(createdId, this.iconFile);
            this.form.patchValue({ iconUrl: ic.data.iconUrl });
          }
        }
      } else {
        const id = this.selectedService?.id;
        if (!id) {
          await this.presentToast('Invalid service selected.');
          return;
        }

        const updatePayload: UpdateServicePayload = {
          ...payload,
        };
        await this.adminServiceService.updateService(id, updatePayload);

        if (this.imageFile) {
          const img = await this.adminServiceService.uploadServiceImage(id, this.imageFile);
          this.form.patchValue({ imageUrl: img.data.imageUrl });
        }
        if (this.iconFile) {
          const ic = await this.adminServiceService.uploadServiceIcon(id, this.iconFile);
          this.form.patchValue({ iconUrl: ic.data.iconUrl });
        }
      }

      this.isModalOpen = false;
      await this.loadServices();
    } catch (error) {
      await this.handleApiError(error);
    } finally {
      this.isSubmitting = false;
      this.cdr.markForCheck();
    }
  }

  async confirmDelete(service: AdminService): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    const alert = await this.alertController.create({
      header: 'Delete Service',
      message: 'Are you sure you want to delete this service?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            void this.deleteService(service);
          },
        },
      ],
    });

    await alert.present();
  }

  private async deleteService(service: AdminService): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.cdr.markForCheck();

    try {
      await this.adminServiceService.deleteService(service.id);
      await this.loadServices();
    } catch (error) {
      await this.handleApiError(error);
    } finally {
      this.isSubmitting = false;
      this.cdr.markForCheck();
    }
  }

  showImageUrl(service: AdminService): string {
    return service.displayType === 'IMAGE' ? service.imageUrl ?? '' : '';
  }

  showIconUrl(service: AdminService): string {
    return service.displayType === 'ICON' ? service.iconUrl ?? '' : '';
  }

  private clearMediaState(): void {
    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }
    if (this.iconPreviewUrl) {
      URL.revokeObjectURL(this.iconPreviewUrl);
    }

    this.imageFile = null;
    this.iconFile = null;
    this.imagePreviewUrl = null;
    this.iconPreviewUrl = null;
    this.isDeletingImage = false;
    this.isDeletingIcon = false;
  }

  private async handleApiError(error: unknown): Promise<void> {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        await this.authService.logout();
        await this.router.navigateByUrl('/login', { replaceUrl: true });
        return;
      }

      if (error.status === 403) {
        const alert = await this.alertController.create({
          header: 'Access denied',
          message: 'Access denied',
          buttons: ['OK'],
        });
        await alert.present();
        return;
      }
    }

    await this.presentToast('Something went wrong. Please try again.');
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

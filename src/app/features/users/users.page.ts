import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { AdminBookingService, Booking } from '../../services/admin-booking.service';
import { AuthService } from '../../services/auth.service';

export interface CustomerPreview {
  key: string;
  fullName: string;
  phone: string;
  bookingCount: number;
}

export interface AdminSessionPreview {
  displayName: string;
  email: string;
  initials: string;
}

@Component({
  selector: 'app-users',
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersPage implements OnInit {
  readonly title = 'User Management';

  readonly lead =
    'Customers surfaced from request activity, plus your current admin session. Use Requests for full records and actions.';

  readonly focusAreas: Array<{
    icon: string;
    title: string;
    subtitle: string;
    orb: 'indigo' | 'violet' | 'amber';
  }> = [
    {
      icon: 'search-outline',
      title: 'Directory & search',
      subtitle: 'Filter by name, phone, or booking history when your user API is connected',
      orb: 'indigo',
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'Roles & access',
      subtitle: 'Map admin roles, partner scopes, and customer accounts to a single identity model',
      orb: 'violet',
    },
    {
      icon: 'notifications-outline',
      title: 'Lifecycle & comms',
      subtitle: 'Verification, suspension, and messaging hooks aligned with your compliance rules',
      orb: 'amber',
    },
  ];

  loading = false;
  loadError?: string;

  /** Latest fetched page of bookings (used to derive customers). */
  bookingsSample: Booking[] = [];
  /** Total bookings reported by the API (all pages). */
  totalBookings = 0;
  sampleLimit = 100;

  customers: CustomerPreview[] = [];
  adminSession: AdminSessionPreview | null = null;

  constructor(
    private readonly adminBookingService: AdminBookingService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly toastController: ToastController,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.adminSession = this.parseAdminUser(this.authService.getUser());
    void this.loadBookingSample();
  }

  get uniqueCustomerCount(): number {
    return this.customers.length;
  }

  get sampleBookingCount(): number {
    return this.bookingsSample.length;
  }

  trackByCustomerKey(_index: number, row: CustomerPreview): string {
    return row.key;
  }

  async onRefresh(event: Event): Promise<void> {
    try {
      await this.loadBookingSample();
    } finally {
      const target = event.target as { complete?: () => Promise<void> } | null;
      void target?.complete?.();
    }
  }

  async loadBookingSample(): Promise<void> {
    this.loading = true;
    this.loadError = undefined;
    this.cdr.markForCheck();

    try {
      const response = await firstValueFrom(
        this.adminBookingService.getBookings(1, this.sampleLimit, null),
      );
      this.bookingsSample = response.data ?? [];
      this.totalBookings = response.meta?.total ?? this.bookingsSample.length;
      this.customers = this.aggregateCustomers(this.bookingsSample);
    } catch (error) {
      await this.handleLoadError(error);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  private aggregateCustomers(bookings: Booking[]): CustomerPreview[] {
    const map = new Map<string, { fullName: string; phone: string; count: number }>();

    for (const b of bookings) {
      const u = b.user;
      if (!u) {
        continue;
      }

      const phone = String(u.phone ?? '').trim();
      const name = String(u.fullName ?? '').trim() || 'Customer';
      const key = phone !== '' ? phone : `booking:${b.id}`;

      const prev = map.get(key);
      if (prev) {
        prev.count += 1;
        if (name !== 'Customer' && prev.fullName === 'Customer') {
          prev.fullName = name;
        }
      } else {
        map.set(key, {
          fullName: name,
          phone: phone !== '' ? phone : '—',
          count: 1,
        });
      }
    }

    return [...map.entries()]
      .map(([key, v]) => ({
        key,
        fullName: v.fullName,
        phone: v.phone,
        bookingCount: v.count,
      }))
      .sort((a, b) => b.bookingCount - a.bookingCount || a.fullName.localeCompare(b.fullName));
  }

  private parseAdminUser(raw: unknown): AdminSessionPreview | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const o = raw as Record<string, unknown>;
    const email = typeof o['email'] === 'string' ? o['email'] : '';
    const displayName =
      (typeof o['fullName'] === 'string' && o['fullName']) ||
      (typeof o['name'] === 'string' && o['name']) ||
      (typeof o['displayName'] === 'string' && o['displayName']) ||
      '';

    if (!email && !displayName) {
      return null;
    }

    const label = displayName || email || 'Admin';
    const initials = label
      .split(/\s+/)
      .filter(Boolean)
      .map((s) => s[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return {
      displayName: label,
      email: email || '—',
      initials: initials || 'A',
    };
  }

  private async handleLoadError(error: unknown): Promise<void> {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        await this.authService.logout();
        await this.router.navigateByUrl('/login', { replaceUrl: true });
        return;
      }
      if (error.status === 403) {
        this.loadError = 'You do not have access to booking data.';
        await this.presentToast('Access denied.');
        return;
      }
    }

    this.loadError = 'Could not load booking sample. Pull to retry or open Requests.';
    await this.presentToast('Something went wrong. Please try again.');
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

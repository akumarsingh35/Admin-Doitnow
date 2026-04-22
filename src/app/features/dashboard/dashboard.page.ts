import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import {
  AdminBookingService,
  Booking,
  BookingStatus,
} from '../../services/admin-booking.service';
import { AdminServiceService } from '../../services/admin-service.service';
import { AdminPartnerService } from '../../services/admin-partner.service';
import { AuthService } from '../../services/auth.service';

export interface AdminSessionPreview {
  displayName: string;
  email: string;
  initials: string;
}

/** Small row for “by service” breakdown (from booking sample). */
export interface ServiceActivityRow {
  label: string;
  count: number;
}

export interface DashboardQuickLink {
  path: string;
  icon: string;
  label: string;
  hint: string;
}

/** Status strip for catalog & directory (aligned with Services / Partners / Users pages). */
export interface DirectoryStripItem {
  path: string;
  label: string;
  value: string;
  hint: string;
  icon: string;
  tone: 'a' | 'b' | 'c';
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED_BY_ADMIN: 'Cancelled (Admin)',
  CANCELLED_BY_USER: 'Cancelled (User)',
};

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage implements OnInit {
  readonly title = 'Dashboard';

  readonly lead =
    'Live request pipeline, catalog, and directory at a glance — same data you use in Requests, Services, Partners, and Users.';

  readonly quickLinks: DashboardQuickLink[] = [
    { path: '/requests', icon: 'git-network-outline', label: 'Requests', hint: 'Queue & actions' },
    { path: '/partners', icon: 'people-outline', label: 'Partners', hint: 'Directory' },
    { path: '/services', icon: 'cube-outline', label: 'Services', hint: 'Catalog' },
    { path: '/users', icon: 'person-circle-outline', label: 'Users', hint: 'Customers' },
  ];

  /** Shown in “By service” copy; matches Users-style booking sample. */
  readonly sampleLimit = 100;

  loading = false;
  loadError?: string;
  catalogLoadError = false;

  adminSession: AdminSessionPreview | null = null;

  /** From API meta (full dataset), not the sample page size. */
  totalBookings = 0;
  pendingBookings = 0;
  confirmedBookings = 0;
  completedBookings = 0;

  /** Services API */
  catalogTotal = 0;
  catalogPopular = 0;

  /** Active partners (GET /admin/partners default). */
  partnersInDirectory = 0;
  partnersLoadError = false;

  /** Unique customers in the booking sample (same idea as Users page). */
  uniqueCustomersInSample = 0;

  serviceActivity: ServiceActivityRow[] = [];
  recentBookings: Booking[] = [];

  directoryStrip: DirectoryStripItem[] = [];

  constructor(
    private readonly adminBookingService: AdminBookingService,
    private readonly adminServiceService: AdminServiceService,
    private readonly adminPartnerService: AdminPartnerService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly toastController: ToastController,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.adminSession = this.parseAdminUser(this.authService.getUser());
    void this.loadDashboard();
  }

  async onRefresh(event: CustomEvent): Promise<void> {
    try {
      await this.loadDashboard();
    } finally {
      (event.target as { complete?: () => void } | null)?.complete?.();
    }
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

  statusLabel(status: BookingStatus): string {
    return STATUS_LABEL[status] ?? status;
  }

  requestSchedule(booking: Booking): string {
    const d = booking.date?.trim() || '—';
    const t = booking.timeSlot?.trim() || '—';
    return `${d} · ${t}`;
  }

  serviceLine(booking: Booking): string {
    return booking.service?.title?.trim() || 'Service';
  }

  trackByBookingId(index: number, booking: Booking): string {
    return booking.id ?? String(index);
  }

  goToDetail(booking: Booking, event?: Event): void {
    event?.stopPropagation();
    void this.router.navigate(['/requests', booking.id], { state: { booking } });
  }

  private async loadDashboard(): Promise<void> {
    this.loading = true;
    this.loadError = undefined;
    this.catalogLoadError = false;
    this.cdr.markForCheck();

    try {
      const [
        allRes,
        pendingRes,
        confirmedRes,
        completedRes,
        sampleRes,
      ] = await Promise.all([
        firstValueFrom(this.adminBookingService.getBookings(1, 1, null)),
        firstValueFrom(this.adminBookingService.getBookings(1, 1, 'PENDING')),
        firstValueFrom(this.adminBookingService.getBookings(1, 1, 'CONFIRMED')),
        firstValueFrom(this.adminBookingService.getBookings(1, 1, 'COMPLETED')),
        firstValueFrom(
          this.adminBookingService.getBookings(1, this.sampleLimit, null),
        ),
      ]);

      this.totalBookings = allRes.meta?.total ?? 0;
      this.pendingBookings = pendingRes.meta?.total ?? 0;
      this.confirmedBookings = confirmedRes.meta?.total ?? 0;
      this.completedBookings = completedRes.meta?.total ?? 0;

      const rows = sampleRes.data ?? [];
      this.recentBookings = rows.slice(0, 6);
      this.serviceActivity = this.aggregateByService(rows);
      this.uniqueCustomersInSample = this.countUniqueCustomers(rows);
    } catch (error) {
      this.totalBookings = 0;
      this.pendingBookings = 0;
      this.confirmedBookings = 0;
      this.completedBookings = 0;
      this.recentBookings = [];
      this.serviceActivity = [];
      this.uniqueCustomersInSample = 0;
      await this.handleBookingError(error);
    }

    try {
      const res = await this.adminServiceService.getServices();
      const list = res.data ?? [];
      this.catalogTotal = list.length;
      this.catalogPopular = list.filter((s) => s.isPopular).length;
    } catch {
      this.catalogLoadError = true;
      this.catalogTotal = 0;
      this.catalogPopular = 0;
    }

    this.partnersLoadError = false;
    try {
      const activePartners = await this.adminPartnerService.listPartners({});
      this.partnersInDirectory = activePartners.length;
    } catch {
      this.partnersLoadError = true;
      this.partnersInDirectory = 0;
    }

    this.patchDirectoryStrip();
    this.loading = false;
    this.cdr.markForCheck();
  }

  private patchDirectoryStrip(): void {
    this.directoryStrip = [
      {
        path: '/services',
        label: 'Catalog',
        value: this.catalogLoadError ? '—' : String(this.catalogTotal),
        hint: this.catalogLoadError ? 'Could not load' : 'Services',
        icon: 'cube-outline',
        tone: 'a',
      },
      {
        path: '/partners',
        label: 'Partners',
        value: this.partnersLoadError ? '—' : String(this.partnersInDirectory),
        hint: this.partnersLoadError ? 'Could not load' : 'Active in directory',
        icon: 'business-outline',
        tone: 'b',
      },
      {
        path: '/users',
        label: 'Customers',
        value: String(this.uniqueCustomersInSample),
        hint: 'Unique in sample',
        icon: 'people-circle-outline',
        tone: 'c',
      },
    ];
  }

  private aggregateByService(bookings: Booking[]): ServiceActivityRow[] {
    const map = new Map<string, number>();
    for (const b of bookings) {
      const label = b.service?.title?.trim() || 'Unspecified';
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 5);
  }

  private countUniqueCustomers(bookings: Booking[]): number {
    const keys = new Set<string>();
    for (const b of bookings) {
      const phone = String(b.user?.phone ?? '').trim();
      if (phone) {
        keys.add(phone);
      }
    }
    return keys.size;
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

  private async handleBookingError(error: unknown): Promise<void> {
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
    this.loadError = 'Could not load request summary. Pull to refresh or open Requests.';
    await this.presentToast('Something went wrong loading the dashboard.');
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

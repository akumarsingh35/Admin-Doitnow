import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../environments/environment';

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED_BY_ADMIN'
  | 'CANCELLED_BY_USER';

export interface BookingCustomer {
  name?: string | null;
  phone?: string | null;
}

export interface BookingAddress {
  line1?: string | null;
  line2?: string | null;
  area?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}

export interface Booking {
  id: string;
  status: BookingStatus;
  createdAt?: string | null;
  price?: number | null;
  customer?: BookingCustomer | null;
  customerPhone?: string | null;
  address?: BookingAddress | null;
  addressText?: string | null;
}

export interface PageResponse<T> {
  items: T[];
  total?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
}

interface AdminBookingsResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class BookingService {
  constructor(private readonly http: HttpClient) {}

  listBookings(options: {
    status?: BookingStatus;
    page: number;
    limit: number;
  }): Observable<PageResponse<Booking>> {
    let params = new HttpParams().set('page', String(options.page)).set('limit', String(options.limit));

    if (options.status) {
      params = params.set('status', options.status);
    }

    return this.http
      .get<AdminBookingsResponse<Booking>>(`${environment.apiUrl}/admin/bookings`, { params })
      .pipe(map((response) => this.normalizeAdminBookingsResponse(response)));
  }

  approveBooking(bookingId: string, partnerId: string): Observable<void> {
    return this.http
      .patch(`${environment.apiUrl}/admin/bookings/${encodeURIComponent(bookingId)}/approve`, { partnerId })
      .pipe(map(() => undefined));
  }

  rejectBooking(bookingId: string, reason: string): Observable<void> {
    return this.http
      .patch(`${environment.apiUrl}/admin/bookings/${encodeURIComponent(bookingId)}/reject`, { reason })
      .pipe(map(() => undefined));
  }

  private normalizeAdminBookingsResponse<T>(response: AdminBookingsResponse<T>): PageResponse<T> {
    const items = response.data ?? [];
    const total = response.meta?.total ?? 0;
    const page = response.meta?.page ?? 1;
    const limit = response.meta?.limit ?? items.length;
    const totalPages = response.meta?.totalPages ?? 0;
    const hasMore = page < totalPages;

    return { items, total, page, limit, hasMore };
  }
}


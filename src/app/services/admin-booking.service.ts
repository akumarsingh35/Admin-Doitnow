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

export interface BookingUser {
  fullName?: string | null;
  phone?: string | null;
}

export interface BookingAddress {
  fullAddress?: string | null;
  phone?: string | null;
}

export interface BookingService {
  title?: string | null;
}

export interface Booking {
  id: string;
  status: BookingStatus;
  date?: string | null;
  timeSlot?: string | null;
  price?: number | null;
  user?: BookingUser | null;
  address?: BookingAddress | null;
  service?: BookingService | null;
}

export interface BookingsResponse {
  data: Booking[];
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
export class AdminBookingService {
  constructor(private readonly http: HttpClient) {}

  getBookings(
    page: number,
    limit: number,
    status: BookingStatus | null,
  ): Observable<BookingsResponse> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(limit));

    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<BookingsResponse>(
      `${environment.apiUrl}/admin/bookings`,
      { params },
    );
  }

  approveBooking(id: string, partnerId: string): Observable<void> {
    return this.http
      .patch(`${environment.apiUrl}/admin/bookings/${encodeURIComponent(id)}/approve`, {
        partnerId,
      })
      .pipe(map(() => undefined));
  }

  rejectBooking(id: string, reason: string): Observable<void> {
    return this.http
      .patch(`${environment.apiUrl}/admin/bookings/${encodeURIComponent(id)}/reject`, {
        reason,
      })
      .pipe(map(() => undefined));
  }
}

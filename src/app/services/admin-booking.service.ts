import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
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
  id?: string | null;
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

/** 400/404 message from `PATCH /admin/bookings/:id/complete` and similar. */
export function bookingHttpErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const b = error.error;
    if (b && typeof b === 'object' && 'message' in b) {
      return String((b as { message: unknown }).message);
    }
    if (typeof b === 'string' && b.trim()) {
      return b;
    }
  }
  return (error as { message?: string })?.message ?? fallback;
}

function unwrapCompleteBookingResponse(body: unknown): Booking {
  if (body && typeof body === 'object' && 'data' in body) {
    const d = (body as { data: unknown }).data;
    if (d && typeof d === 'object') {
      return d as Booking;
    }
  }
  return body as Booking;
}

@Injectable({
  providedIn: 'root',
})
export class AdminBookingService {
  constructor(private readonly http: HttpClient) {}

  getBookingById(id: string): Observable<Booking> {
    return this.http.get<Booking>(
      `${environment.apiUrl}/admin/bookings/${encodeURIComponent(id)}`,
    );
  }

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

  /**
   * `PATCH /admin/bookings/:id/complete` — no body, Bearer admin token; 200 returns updated booking.
   */
  completeBooking(id: string): Observable<Booking> {
    const url = `${environment.apiUrl}/admin/bookings/${encodeURIComponent(id)}/complete`;
    return this.http.patch<unknown>(url, null).pipe(map((res) => unwrapCompleteBookingResponse(res)));
  }
}

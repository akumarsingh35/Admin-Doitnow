import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/**
 * A catalog service mapped to a partner (list/detail responses).
 * `serviceId` is the canonical catalog id for filters and approve flows.
 */
export interface AdminPartnerServiceMapping {
  serviceId: string;
  title: string;
  isActiveMapping: boolean;
}

/**
 * Address on a partner (GET) — matches create/update `address` object where possible.
 * Legacy line/postal/label fields are supported when reading older responses.
 */
export interface AdminPartnerAddress {
  id?: string;
  label?: string | null;
  fullAddress?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  /** Legacy / alternate response shapes */
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  country?: string | null;
  addressLabel?: string | null;
}

export interface AdminPartnerActiveBooking {
  id: string;
  serviceId: string;
  serviceTitle: string;
  date: string;
  timeSlot: string;
  userId: string;
  userName: string;
  userPhone: string;
}

/**
 * Partner list / detail (GET list, search, or GET :id).
 * Aligns with admin partner API: profile, mappings, addresses, and active approved bookings.
 */
export interface AdminPartner {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  services: AdminPartnerServiceMapping[];
  addresses: AdminPartnerAddress[];
  activeApprovedBookingCount?: number;
  activeApprovedBookings?: AdminPartnerActiveBooking[];
}

/** Body for POST /admin/partners (create-partner.dto). */
export interface CreatePartnerDto {
  fullName: string;
  phone: string;
  email: string;
  /**
   * Catalog service ids (same as `GET /admin/services` item ids), not display titles.
   */
  serviceIds: string[];
  address: PartnerAddressInput;
  /** Omitted on create if your API does not accept it; used on PATCH when editing. */
  isActive?: boolean;
}

/** Body for PATCH /admin/partners/:id (update-partner.dto). */
export type UpdatePartnerDto = Partial<CreatePartnerDto>;

/**
 * Nested `address` for create/update — matches server contract (e.g. POST /admin/partners).
 */
export interface PartnerAddressInput {
  label?: string;
  fullAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface ListPartnersQuery {
  search?: string;
  serviceId?: string;
  onlyActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminPartnerService {
  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
  ) {}

  private buildAuthHeaders(): HttpHeaders {
    const accessToken = this.authService.getAccessToken();
    return accessToken
      ? new HttpHeaders({ Authorization: `Bearer ${accessToken}` })
      : new HttpHeaders();
  }

  private qParams(
    q: ListPartnersQuery,
    withOnlyActiveDefault = true,
  ): HttpParams {
    let params = new HttpParams();
    if (q.search?.trim()) {
      params = params.set('search', q.search.trim());
    }
    if (q.serviceId?.trim()) {
      params = params.set('serviceId', q.serviceId.trim());
    }
    if (q.onlyActive !== undefined) {
      params = params.set('onlyActive', String(q.onlyActive));
    } else if (withOnlyActiveDefault) {
      params = params.set('onlyActive', 'true');
    }
    return params;
  }

  /** GET /admin/partners — list (default active only). */
  async listPartners(query: ListPartnersQuery = {}): Promise<AdminPartner[]> {
    return this.unwrapList(
      await firstValueFrom(
        this.http.get<unknown>(`${environment.apiUrl}/admin/partners`, {
          params: this.qParams(query),
          headers: this.buildAuthHeaders(),
        }),
      ),
    );
  }

  /** GET /admin/partners/all — list active and inactive. */
  async listAllPartners(query: ListPartnersQuery = {}): Promise<AdminPartner[]> {
    return this.unwrapList(
      await firstValueFrom(
        this.http.get<unknown>(`${environment.apiUrl}/admin/partners/all`, {
          params: this.qParams(query, false),
          headers: this.buildAuthHeaders(),
        }),
      ),
    );
  }

  /**
   * GET /admin/partners/search — search (e.g. booking assignment).
   * Recommended: `search` + `serviceId` from booking + `onlyActive: true`.
   */
  async searchPartners(query: ListPartnersQuery): Promise<AdminPartner[]> {
    return this.unwrapList(
      await firstValueFrom(
        this.http.get<unknown>(`${environment.apiUrl}/admin/partners/search`, {
          params: this.qParams(query, false),
          headers: this.buildAuthHeaders(),
        }),
      ),
    );
  }

  /** GET /admin/partners/:id */
  async getPartnerById(id: string): Promise<AdminPartner> {
    return this.expectOne(
      await firstValueFrom(
        this.http.get<unknown>(`${environment.apiUrl}/admin/partners/${encodeURIComponent(id)}`, {
          headers: this.buildAuthHeaders(),
        }),
      ),
    );
  }

  /** POST /admin/partners */
  async createPartner(body: CreatePartnerDto): Promise<AdminPartner> {
    return this.expectOne(
      await firstValueFrom(
        this.http.post<unknown>(`${environment.apiUrl}/admin/partners`, body, {
          headers: this.buildAuthHeaders(),
        }),
      ),
    );
  }

  /** PATCH /admin/partners/:id */
  async updatePartner(id: string, body: UpdatePartnerDto): Promise<AdminPartner> {
    return this.expectOne(
      await firstValueFrom(
        this.http.patch<unknown>(
          `${environment.apiUrl}/admin/partners/${encodeURIComponent(id)}`,
          body,
          { headers: this.buildAuthHeaders() },
        ),
      ),
    );
  }

  /** DELETE /admin/partners/:id — soft delete (400 if non-completable active approved bookings). */
  async deletePartner(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${environment.apiUrl}/admin/partners/${encodeURIComponent(id)}`, {
        headers: this.buildAuthHeaders(),
      }),
    );
  }

  private unwrapList(raw: unknown): AdminPartner[] {
    const items = this.extractListArray(raw);
    return items.map((row) => this.normalizePartner(row as AdminPartner));
  }

  private extractListArray(raw: unknown): unknown[] {
    if (Array.isArray(raw)) {
      return raw;
    }
    if (raw && typeof raw === 'object') {
      const o = raw as Record<string, unknown>;
      for (const key of ['data', 'items', 'results', 'partners']) {
        const v = o[key];
        if (Array.isArray(v)) {
          return v;
        }
        if (v && typeof v === 'object' && 'data' in (v as object)) {
          const inner = (v as { data: unknown }).data;
          if (Array.isArray(inner)) {
            return inner;
          }
        }
      }
    }
    return [];
  }

  private expectOne(raw: unknown): AdminPartner {
    if (raw && typeof raw === 'object' && 'data' in (raw as object)) {
      const d = (raw as { data: unknown }).data;
      if (d && typeof d === 'object') {
        return this.normalizePartner(d as AdminPartner);
      }
    }
    return this.normalizePartner(raw as AdminPartner);
  }

  /** Normalizes legacy or alternate API field names into our standard shapes. */
  private normalizePartner(p: AdminPartner): AdminPartner {
    const services = (p.services || []).map((m) => this.normalizeServiceMapping(m));
    const addresses = (p.addresses || []).map((a) => this.normalizeAddress(a));
    return { ...p, services, addresses };
  }

  private normalizeServiceMapping(m: {
    serviceId?: string;
    id?: string;
    title: string;
    isActiveMapping: boolean;
  }): AdminPartnerServiceMapping {
    const serviceId = m.serviceId ?? m.id ?? '';
    return {
      serviceId,
      title: m.title,
      isActiveMapping: m.isActiveMapping,
    };
  }

  private normalizeAddress(
    a: AdminPartnerAddress & { line1?: string | null; line2?: string | null },
  ): AdminPartnerAddress {
    const addressLine1 = a.addressLine1 ?? a.line1 ?? null;
    const addressLine2 = a.addressLine2 ?? a.line2 ?? null;
    const fullAddress =
      a.fullAddress?.trim() ||
      [addressLine1, addressLine2]
        .filter((x) => (typeof x === 'string' ? x.trim() : ''))
        .join(', ') ||
      null;
    const label = a.label ?? a.addressLabel ?? null;
    const pincode = a.pincode ?? a.postalCode ?? null;
    return {
      ...a,
      label,
      fullAddress: fullAddress || null,
      pincode,
      addressLine1,
      addressLine2,
    };
  }
}

export function firstAddressLine(partner: AdminPartner): string {
  const a = partner.addresses?.[0];
  if (!a) {
    return '—';
  }
  if (a.fullAddress?.trim()) {
    return a.fullAddress.trim();
  }
  const l1 = (a.addressLine1 ?? '').trim();
  const l2 = (a.addressLine2 ?? '').trim();
  const city = (a.city ?? '').trim();
  const st = (a.state ?? '').trim();
  const pc = (a.pincode ?? a.postalCode ?? '').trim();
  const parts = [l1, l2, city, st, pc, (a.country ?? '').trim()].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

export function serviceTitles(partner: AdminPartner): string[] {
  return (partner.services || []).map((s) => s.title).filter(Boolean);
}

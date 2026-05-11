import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export type ServiceDisplayType = 'IMAGE' | 'ICON';

export interface AdminService {
  id: string;
  /** Some list APIs expose Mongo-style _id; prefer `id` in app code via `getCatalogServiceId()`. */
  _id?: string;
  serviceId?: string;
  slug?: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  startingPrice: number;
  currency: string;
  imageUrl?: string | null;
  iconUrl?: string | null;
  displayType?: ServiceDisplayType;
  colorClass?: string | null;
  tag?: string | null;
  isPopular: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListServicesResponse {
  message: string;
  data: AdminService[];
}

/** Stable catalog primary key for API payloads (never use `title` as an id). */
export function getCatalogServiceId(s: AdminService): string {
  const raw = s.id ?? s.serviceId ?? s._id;
  return raw != null && raw !== '' ? String(raw) : '';
}

export interface CreateServicePayload {
  title: string;
  subtitle?: string;
  description?: string;
  startingPrice: number;
  currency: string;
  imageUrl?: string;
  iconUrl?: string;
  displayType?: ServiceDisplayType;
  colorClass?: string;
  tag?: string;
  isPopular: boolean;
}

export type UpdateServicePayload = Partial<CreateServicePayload>;

@Injectable({
  providedIn: 'root',
})
export class AdminServiceService {
  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
  ) {}

  async getServices(): Promise<ListServicesResponse> {
    return firstValueFrom(
      this.http.get<ListServicesResponse>(`${environment.apiUrl}/admin/services`, {
        headers: this.buildAuthHeaders(),
      }),
    );
  }

  async createService(payload: CreateServicePayload): Promise<unknown> {
    return firstValueFrom(
      this.http.post(`${environment.apiUrl}/admin/services`, payload, {
        headers: this.buildAuthHeaders(),
      }),
    );
  }

  async updateService(id: string, payload: UpdateServicePayload): Promise<unknown> {
    return firstValueFrom(
      this.http.patch(`${environment.apiUrl}/admin/services/${encodeURIComponent(id)}`, payload, {
        headers: this.buildAuthHeaders(),
      }),
    );
  }

  async deleteService(id: string): Promise<unknown> {
    return firstValueFrom(
      this.http.delete(`${environment.apiUrl}/admin/services/${encodeURIComponent(id)}`, {
        headers: this.buildAuthHeaders(),
      }),
    );
  }

  async uploadServiceImage(id: string, file: File): Promise<{ message: string; data: { imageUrl: string } }> {
    this.assertValidUploadFile(file);
    const formData = new FormData();
    formData.append('file', file, file.name || 'service-image');

    return firstValueFrom(
      this.http.post<{ message: string; data: { imageUrl: string } }>(
        `${environment.apiUrl}/admin/services/${encodeURIComponent(id)}/upload-image`,
        formData,
        { headers: this.buildAuthHeaders() },
      ),
    );
  }

  async uploadServiceIcon(id: string, file: File): Promise<{ message: string; data: { iconUrl: string } }> {
    this.assertValidUploadFile(file);
    const formData = new FormData();
    formData.append('file', file, file.name || 'service-icon');

    return firstValueFrom(
      this.http.post<{ message: string; data: { iconUrl: string } }>(
        `${environment.apiUrl}/admin/services/${encodeURIComponent(id)}/upload-icon`,
        formData,
        { headers: this.buildAuthHeaders() },
      ),
    );
  }

  async deleteServiceImage(id: string): Promise<{ message: string; data: { imageUrl: null } }> {
    return firstValueFrom(
      this.http.delete<{ message: string; data: { imageUrl: null } }>(
        `${environment.apiUrl}/admin/services/${encodeURIComponent(id)}/image`,
        { headers: this.buildAuthHeaders() },
      ),
    );
  }

  async deleteServiceIcon(id: string): Promise<{ message: string; data: { iconUrl: null } }> {
    return firstValueFrom(
      this.http.delete<{ message: string; data: { iconUrl: null } }>(
        `${environment.apiUrl}/admin/services/${encodeURIComponent(id)}/icon`,
        { headers: this.buildAuthHeaders() },
      ),
    );
  }

  private buildAuthHeaders(): HttpHeaders {
    const accessToken = this.authService.getAccessToken();

    return accessToken
      ? new HttpHeaders({ Authorization: `Bearer ${accessToken}` })
      : new HttpHeaders();
  }

  private assertValidUploadFile(file: File): void {
    if (!(file instanceof File) || file.size <= 0) {
      throw new Error('Invalid file selected for upload.');
    }
  }
}

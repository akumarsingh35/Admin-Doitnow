import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export type ServiceDisplayType = 'IMAGE' | 'ICON';

export interface AdminService {
  id: string;
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
  createdAt?: string;
  updatedAt?: string;
}

export interface ListServicesResponse {
  message: string;
  data: AdminService[];
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
    const formData = new FormData();
    formData.append('file', file);

    return firstValueFrom(
      this.http.post<{ message: string; data: { imageUrl: string } }>(
        `${environment.apiUrl}/admin/services/${encodeURIComponent(id)}/upload-image`,
        formData,
        { headers: this.buildAuthHeaders() },
      ),
    );
  }

  async uploadServiceIcon(id: string, file: File): Promise<{ message: string; data: { iconUrl: string } }> {
    const formData = new FormData();
    formData.append('file', file);

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
}

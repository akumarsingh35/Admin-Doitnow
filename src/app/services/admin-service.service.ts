import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export type ServiceDisplayType = 'IMAGE' | 'ICON';

export interface AdminService {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  startingPrice: number;
  currency: 'INR';
  imageUrl?: string | null;
  iconUrl?: string | null;
  displayType: ServiceDisplayType;
  colorClass?: string | null;
  tag?: string | null;
  isPopular: boolean;
}

export interface ListServicesResponse {
  message: string;
  data: AdminService[];
}

export interface CreateServicePayload {
  title: string;
  subtitle: string;
  description: string;
  startingPrice: number;
  currency: 'INR';
  imageUrl: string;
  iconUrl: string;
  displayType: ServiceDisplayType;
  colorClass: string;
  tag: string;
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

  private buildAuthHeaders(): HttpHeaders {
    const accessToken = this.authService.getAccessToken();

    return accessToken
      ? new HttpHeaders({ Authorization: `Bearer ${accessToken}` })
      : new HttpHeaders();
  }
}

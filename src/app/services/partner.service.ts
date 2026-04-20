import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../environments/environment';

export interface Partner {
  id: string;
  name?: string | null;
  phone?: string | null;
  services?: string[] | null;
}

type AnyListResponse<T> =
  | { items: T[]; total?: number; page?: number; limit?: number; hasMore?: boolean }
  | { data: T[]; total?: number; page?: number; limit?: number; hasMore?: boolean }
  | { results: T[]; total?: number; page?: number; limit?: number; hasMore?: boolean };

export interface PageResponse<T> {
  items: T[];
  total?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class PartnerService {
  constructor(private readonly http: HttpClient) {}

  listPartners(options: { q?: string; page: number; limit: number }): Observable<PageResponse<Partner>> {
    let params = new HttpParams().set('page', String(options.page)).set('limit', String(options.limit));

    if (options.q) {
      params = params.set('q', options.q);
    }

    return this.http
      .get<AnyListResponse<Partner>>(`${environment.apiUrl}/admin/partners`, { params })
      .pipe(map((response) => this.normalizePageResponse(response, options.page, options.limit)));
  }

  private normalizePageResponse<T>(
    response: AnyListResponse<T>,
    requestedPage: number,
    requestedLimit: number,
  ): PageResponse<T> {
    const items = 'items' in response ? response.items : 'data' in response ? response.data : response.results;
    const total = response.total;
    const page = response.page ?? requestedPage;
    const limit = response.limit ?? requestedLimit;

    let hasMore = response.hasMore;
    if (typeof hasMore !== 'boolean') {
      hasMore = items.length >= limit;
    }

    return { items, total, page, limit, hasMore };
  }
}


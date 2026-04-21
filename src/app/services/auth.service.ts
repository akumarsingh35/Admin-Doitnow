import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';

import { environment } from '../../environments/environment';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: unknown;
}

interface GoogleAuthResponse {
  accessToken?: string;
  access_token?: string;
  refreshToken?: string;
  refresh_token?: string;
  user?: unknown;
  data?: {
    accessToken?: string;
    access_token?: string;
    refreshToken?: string;
    refresh_token?: string;
    user?: unknown;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly accessTokenKey = 'accessToken';
  private readonly refreshTokenKey = 'refreshToken';
  private readonly userKey = 'user';

  constructor(private readonly http: HttpClient) {}

  isAuthenticated(): boolean {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();

    if (!accessToken || !refreshToken) {
      if (accessToken || refreshToken) {
        this.clearSession();
      }

      return false;
    }

    const expiresAt = this.getJwtExpiry(accessToken);
    if (expiresAt && Date.now() >= expiresAt) {
      this.clearSession();
      return false;
    }

    return true;
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  getUser<T = unknown>(): T | null {
    const rawUser = localStorage.getItem(this.userKey);

    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as T;
    } catch {
      return null;
    }
  }

  async loginWithGoogleToken(idToken: string): Promise<AuthSession> {
    const response = await firstValueFrom(
      this.http
        .post<GoogleAuthResponse>(`${environment.apiUrl}/admin/auth/google`, {
          token: idToken,
        })
        .pipe(timeout(20_000)),
    );

    const session = this.normalizeSession(response);
    this.setSession(session);

    return session;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/auth/logout`, {}).pipe(timeout(10_000)));
    } finally {
      this.clearSession();
    }
  }

  setSession(session: AuthSession): void {
    localStorage.setItem(this.accessTokenKey, session.accessToken);
    localStorage.setItem(this.refreshTokenKey, session.refreshToken);
    localStorage.setItem(this.userKey, JSON.stringify(session.user ?? null));
  }

  clearSession(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
  }

  private normalizeSession(response: GoogleAuthResponse): AuthSession {
    const payload = response.data ?? response;

    const accessToken = payload.accessToken ?? payload.access_token ?? '';
    const refreshToken = payload.refreshToken ?? payload.refresh_token ?? '';

    if (!accessToken || !refreshToken) {
      throw new Error('Invalid authentication response from server.');
    }

    return {
      accessToken,
      refreshToken,
      user: payload.user ?? null,
    };
  }

  private getJwtExpiry(token: string): number | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    try {
      const payload = JSON.parse(this.base64UrlDecode(parts[1])) as { exp?: unknown };
      return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  private base64UrlDecode(value: string): string {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return atob(padded);
  }
}

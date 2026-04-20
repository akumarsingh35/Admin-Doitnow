import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

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
    return Boolean(this.getAccessToken());
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
      this.http.post<GoogleAuthResponse>(`${environment.apiUrl}/admin/auth/google`, {
        token: idToken,
      }),
    );

    const session = this.normalizeSession(response);
    this.setSession(session);

    return session;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/auth/logout`, {}));
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
}

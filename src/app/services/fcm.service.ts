import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FcmService {
  private readonly fcmTokenKey = 'fcmToken';

  constructor(private readonly http: HttpClient) {}

  /**
   * Initialize FCM notifications
   * - Android: Uses Capacitor PushNotifications plugin
   * - Web: Uses browser Notification API (simple permission check only)
   */
  async initNotifications(accessToken: string): Promise<void> {
    const platform = Capacitor.getPlatform();

    if (platform === 'android') {
      await this.initAndroidNotifications(accessToken);
    } else {
      // Web or other platforms - optional basic permission
      await this.initWebNotifications();
    }
  }

  /**
   * Android: Initialize using Capacitor PushNotifications
   */
  private async initAndroidNotifications(accessToken: string): Promise<void> {
    try {
      // Request permission via Capacitor plugin
      const permission = await PushNotifications.requestPermissions();

      if (permission.receive !== 'granted') {
        console.log('[FCM] Permission not granted on Android');
        return;
      }

      // Register for push notifications
      await PushNotifications.register();

      // Listen for successful registration (FCM token received)
      PushNotifications.addListener('registration', async (token) => {
        console.log('[FCM] Android FCM Token:', token.value.substring(0, 20) + '...');

        // Save token to backend
        await this.saveFcmToken(token.value, accessToken);
      });

      // Listen for registration errors
      PushNotifications.addListener('registrationError', (error) => {
        console.error('[FCM] Android registration error:', error);
      });

      // Listen for incoming push notifications (app in foreground)
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[FCM] Push notification received:', notification);

        // Show alert for new booking
        const title = notification.title || 'New Notification';
        const body = notification.body || '';
        alert(`${title}\n${body}`);
      });

      console.log('[FCM] Android notifications initialized');
    } catch (error) {
      console.error('[FCM] Error initializing Android notifications:', error);
    }
  }

  /**
   * Web: Initialize using browser Notification API
   * (Simple permission check, full FCM not implemented for web)
   */
  private async initWebNotifications(): Promise<void> {
    // Check if Notification API is available (browser environment)
    if (typeof Notification === 'undefined') {
      console.log('[FCM] Notification API not available');
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        console.log('[FCM] Web notification permission denied');
        return;
      }

      console.log('[FCM] Web notification permission granted (basic)');
      // NOTE: Full web FCM implementation not needed per requirements
    } catch (error) {
      console.error('[FCM] Error with web notifications:', error);
    }
  }

  /**
   * Save FCM token to backend
   * PATCH /users/fcm-token
   */
  async saveFcmToken(token: string, accessToken: string): Promise<void> {
    if (!token) {
      console.log('[FCM] Token is null, not saving');
      return;
    }

    // Store locally first
    localStorage.setItem(this.fcmTokenKey, token);

    const headers = new HttpHeaders({
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    });

    try {
      await firstValueFrom(
        this.http.patch(
          `${environment.apiUrl}/users/fcm-token`,
          { fcmToken: token },
          { headers }
        )
      );

      console.log('[FCM] Token saved to backend successfully');
    } catch (error) {
      console.error('[FCM] Failed to save token to backend:', error);
      // Do not crash app, just log error
    }
  }

  /**
   * Legacy method alias for backward compatibility
   * Calls initNotifications
   */
  async initFCM(accessToken: string): Promise<void> {
    return this.initNotifications(accessToken);
  }

  /**
   * Legacy method - now handled by push notification listeners
   */
  listenForMessages(): void {
    // Listeners are set up in initAndroidNotifications
    // No-op for compatibility
    console.log('[FCM] Message listeners registered during init');
  }

  /**
   * Clear stored FCM token on logout
   */
  clearToken(): void {
    localStorage.removeItem(this.fcmTokenKey);
    console.log('[FCM] Token cleared from local storage');
  }

  /**
   * Get stored FCM token
   */
  getStoredToken(): string | null {
    return localStorage.getItem(this.fcmTokenKey);
  }
}

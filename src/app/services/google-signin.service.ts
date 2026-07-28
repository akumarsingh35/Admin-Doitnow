import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

import { environment } from '../../environments/environment';

export type GoogleCredentialHandler = (idToken: string) => void;

@Injectable({
  providedIn: 'root',
})
export class GoogleSignInService {
  private static readonly SCRIPT_TIMEOUT_MS = 30_000;

  private nativeInitialized = false;
  private webInitialized = false;
  private gisScriptPromise?: Promise<void>;
  private credentialHandler?: GoogleCredentialHandler;

  isNativePlatform(): boolean {
    return Capacitor.getPlatform() !== 'web';
  }

  /**
   * Native (Capacitor) Google Sign-In — returns an ID token.
   */
  async signInNative(): Promise<string> {
    if (!this.nativeInitialized) {
      await GoogleAuth.initialize({
        clientId: environment.googleWebClientId,
        scopes: ['email', 'profile', 'openid'],
        grantOfflineAccess: false,
      });
      this.nativeInitialized = true;
    }

    const user = await GoogleAuth.signIn();
    const idToken = user.authentication?.idToken;

    if (!idToken) {
      throw new Error('Google Sign-In did not return an idToken.');
    }

    return idToken;
  }

  /**
   * Web: mount the official GIS "Sign in with Google" button (FedCM-ready).
   * One Tap prompt() is intentionally not used — it often skips on button-driven login.
   */
  async mountWebButton(
    container: HTMLElement,
    onCredential: GoogleCredentialHandler,
  ): Promise<void> {
    this.credentialHandler = onCredential;
    await this.ensureWebInitialized();

    container.replaceChildren();
    window.google.accounts.id.renderButton(container, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: Math.min(container.clientWidth || 320, 400),
    });
  }

  private async ensureWebInitialized(): Promise<void> {
    if (this.webInitialized) {
      // Re-bind callback in case the page remounts.
      window.google.accounts.id.initialize({
        client_id: environment.googleWebClientId,
        callback: (response) => this.handleCredentialResponse(response),
        use_fedcm_for_button: true,
        use_fedcm_for_prompt: true,
        auto_select: false,
        cancel_on_tap_outside: true,
        context: 'signin',
      });
      return;
    }

    if (!environment.googleWebClientId) {
      throw new Error(
        'Missing Google web client id. Set environment.googleWebClientId before using Google sign-in.',
      );
    }

    await this.loadGoogleIdentityScript();

    window.google.accounts.id.initialize({
      client_id: environment.googleWebClientId,
      callback: (response) => this.handleCredentialResponse(response),
      use_fedcm_for_button: true,
      use_fedcm_for_prompt: true,
      auto_select: false,
      cancel_on_tap_outside: true,
      context: 'signin',
    });

    this.webInitialized = true;
  }

  private handleCredentialResponse(response: GoogleCredentialResponse): void {
    if (!response.credential) {
      console.error('[GoogleSignIn] Missing credential in GIS response.');
      return;
    }

    this.credentialHandler?.(response.credential);
  }

  private loadGoogleIdentityScript(): Promise<void> {
    if (window.google?.accounts?.id) {
      return Promise.resolve();
    }

    if (!this.gisScriptPromise) {
      this.gisScriptPromise = new Promise<void>((resolve, reject) => {
        const existingScript = document.querySelector<HTMLScriptElement>(
          'script[data-google-identity="true"]',
        );

        if (existingScript) {
          if (window.google?.accounts?.id) {
            resolve();
            return;
          }

          existingScript.addEventListener('load', () => resolve(), { once: true });
          existingScript.addEventListener('error', () => reject(new Error('Failed to load GIS.')), {
            once: true,
          });

          const pollStart = Date.now();
          const interval = window.setInterval(() => {
            if (window.google?.accounts?.id) {
              window.clearInterval(interval);
              resolve();
              return;
            }

            if (Date.now() - pollStart > GoogleSignInService.SCRIPT_TIMEOUT_MS) {
              window.clearInterval(interval);
              reject(new Error('Google Identity Services did not initialize.'));
            }
          }, 100);
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.dataset['googleIdentity'] = 'true';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load GIS.'));
        document.head.appendChild(script);
      });
    }

    return this.gisScriptPromise;
  }
}

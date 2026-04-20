import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GoogleSignInService {
  private nativeInitialized = false;
  private webInitialized = false;
  private gisScriptPromise?: Promise<void>;
  private webTokenResolver?: (token: string) => void;
  private webTokenRejecter?: (reason?: unknown) => void;

  async signIn(): Promise<string> {
    const platform = Capacitor.getPlatform();

    return platform === 'web' ? this.signInWeb() : this.signInNative();
  }

  private async signInNative(): Promise<string> {
    if (!this.nativeInitialized) {
      await GoogleAuth.initialize();

      this.nativeInitialized = true;
    }

    const user = await GoogleAuth.signIn();
    const idToken = user.authentication?.idToken;

    if (!idToken) {
      throw new Error('Google Sign-In did not return an idToken.');
    }

    return idToken;
  }

  private async signInWeb(): Promise<string> {
    await this.ensureWebInitialized();

    return new Promise<string>((resolve, reject) => {
      this.webTokenResolver = resolve;
      this.webTokenRejecter = reject;

      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          this.resetWebPromiseHandlers();
          reject(new Error('Google sign-in prompt was not displayed.'));
        }
      });
    });
  }

  private async ensureWebInitialized(): Promise<void> {
    if (this.webInitialized) {
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
      callback: (response: GoogleCredentialResponse) => {
        if (!response.credential) {
          this.webTokenRejecter?.(new Error('Missing Google credential.'));
          this.resetWebPromiseHandlers();
          return;
        }

        this.webTokenResolver?.(response.credential);
        this.resetWebPromiseHandlers();
      },
    });

    this.webInitialized = true;
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
          existingScript.addEventListener('load', () => resolve(), { once: true });
          existingScript.addEventListener('error', () => reject(new Error('Failed to load GIS.')), {
            once: true,
          });
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

  private resetWebPromiseHandlers(): void {
    this.webTokenResolver = undefined;
    this.webTokenRejecter = undefined;
  }
}

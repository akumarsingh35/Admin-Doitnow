import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GoogleSignInService {
  private static readonly WEB_SIGN_IN_TIMEOUT_MS = 30_000;

  private nativeInitialized = false;
  private webInitialized = false;
  private gisScriptPromise?: Promise<void>;
  private webTokenResolver?: (token: string) => void;
  private webTokenRejecter?: (reason?: unknown) => void;
  private webSignInTimeout?: ReturnType<typeof setTimeout>;

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
    return this.signInWebWithPrompt();
  }

  private async signInWebWithPrompt(): Promise<string> {
    await this.ensureWebInitialized();

    this.rejectPendingWebSignIn(new Error('Google sign-in was interrupted.'));
    window.google.accounts.id.cancel?.();

    return new Promise<string>((resolve, reject) => {
      this.webTokenResolver = resolve;
      this.webTokenRejecter = reject;
      this.webSignInTimeout = setTimeout(() => {
        this.rejectPendingWebSignIn(new Error('Google sign-in timed out. Please try again.'));
      }, GoogleSignInService.WEB_SIGN_IN_TIMEOUT_MS);

      window.google.accounts.id.prompt((notification) => {
        void notification;
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
      use_fedcm_for_prompt: true,
      callback: (response: GoogleCredentialResponse) => {
        if (!response.credential) {
          this.rejectPendingWebSignIn(new Error('Missing Google credential.'));
          return;
        }

        this.resolvePendingWebSignIn(response.credential);
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
          if (window.google?.accounts?.id) {
            resolve();
            return;
          }

          existingScript.addEventListener('load', () => resolve(), { once: true });
          existingScript.addEventListener('error', () => reject(new Error('Failed to load GIS.')), {
            once: true,
          });

          // If the script already loaded before listeners were attached, resolve once GIS appears.
          const pollStart = Date.now();
          const interval = window.setInterval(() => {
            if (window.google?.accounts?.id) {
              window.clearInterval(interval);
              resolve();
              return;
            }

            if (Date.now() - pollStart > GoogleSignInService.WEB_SIGN_IN_TIMEOUT_MS) {
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

  private resetWebPromiseHandlers(): void {
    if (this.webSignInTimeout) {
      clearTimeout(this.webSignInTimeout);
      this.webSignInTimeout = undefined;
    }

    this.webTokenResolver = undefined;
    this.webTokenRejecter = undefined;
  }

  private resolvePendingWebSignIn(token: string): void {
    this.webTokenResolver?.(token);
    this.resetWebPromiseHandlers();
  }

  private rejectPendingWebSignIn(error: Error): void {
    this.webTokenRejecter?.(error);
    this.resetWebPromiseHandlers();
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return JSON.stringify(error);
  }
}

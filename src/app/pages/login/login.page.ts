import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { TimeoutError } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { FcmService } from '../../services/fcm.service';
import { GoogleSignInService } from '../../services/google-signin.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('googleButtonHost', { static: false })
  googleButtonHost?: ElementRef<HTMLElement>;

  loading = false;
  buttonReady = false;
  buttonError = '';
  errorMessage = '';
  readonly isNative = this.googleSignInService.isNativePlatform();

  private destroyed = false;

  constructor(
    private readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef,
    private readonly fcmService: FcmService,
    private readonly googleSignInService: GoogleSignInService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      void this.router.navigateByUrl('/dashboard', { replaceUrl: true });
    }
  }

  ngAfterViewInit(): void {
    if (!this.isNative) {
      // Wait a tick so *ngIf host is laid out (width for renderButton).
      setTimeout(() => void this.mountWebGoogleButton(), 0);
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
  }

  async continueWithGoogleNative(): Promise<void> {
    if (this.loading) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      const idToken = await this.googleSignInService.signInNative();
      await this.finishLogin(idToken);
    } catch (error) {
      this.handleLoginError(error);
    } finally {
      this.loading = false;
    }
  }

  private async mountWebGoogleButton(): Promise<void> {
    const host = this.googleButtonHost?.nativeElement;
    if (!host || this.destroyed) {
      return;
    }

    this.buttonReady = false;
    this.buttonError = '';
    this.cdr.detectChanges();

    try {
      await this.googleSignInService.mountWebButton(host, (idToken) => {
        void this.onWebCredential(idToken);
      });

      if (!this.destroyed) {
        this.buttonReady = true;
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('[Login] Failed to mount Google button:', error);
      if (!this.destroyed) {
        this.buttonError =
          error instanceof Error
            ? this.getGoogleSignInErrorMessage(error.message)
            : 'Could not load Google sign-in. Please refresh and retry.';
        this.cdr.detectChanges();
      }
    }
  }

  private async onWebCredential(idToken: string): Promise<void> {
    if (this.loading || this.destroyed) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      await this.finishLogin(idToken);
    } catch (error) {
      this.handleLoginError(error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  private async finishLogin(idToken: string): Promise<void> {
    const session = await this.authService.loginWithGoogleToken(idToken);
    void this.fcmService.initFCM(session.accessToken);
    await this.router.navigateByUrl('/dashboard', { replaceUrl: true });
  }

  private handleLoginError(error: unknown): void {
    console.error('[Login] Google sign-in failed:', error);

    if (error instanceof HttpErrorResponse && error.status === 403) {
      this.errorMessage = 'Only admin or super admin can access admin panel';
    } else if (error instanceof HttpErrorResponse && error.status === 0) {
      this.errorMessage = 'Cannot reach the API. Check your network and try again.';
    } else if (error instanceof TimeoutError) {
      this.errorMessage = 'Login timed out. Please check your network and try again.';
    } else if (error instanceof Error) {
      this.errorMessage = this.getGoogleSignInErrorMessage(error.message);
    } else {
      this.errorMessage = 'Google sign-in failed. Please try again.';
    }
  }

  private getGoogleSignInErrorMessage(rawMessage: string): string {
    const message = rawMessage.toLowerCase();

    if (message.includes('dismissed') || message.includes('tap_outside') || message.includes('user_cancel')) {
      return 'Google sign-in was cancelled. Please try again.';
    }

    if (message.includes('skipped') || message.includes('suppressed')) {
      return 'Google sign-in was skipped. Please retry in a few seconds.';
    }

    if (message.includes('popup_closed_by_user')) {
      return 'Google sign-in popup was closed before completing login.';
    }

    if (message.includes('popup_blocked_by_browser')) {
      return 'Google sign-in popup was blocked by browser. Please allow popups and retry.';
    }

    if (message.includes('opt_out_or_no_session')) {
      return 'No active Google session found. Please sign in to Google in this browser and retry.';
    }

    if (message.includes('unregistered_origin')) {
      return `This app origin is not authorized in Google OAuth settings (${window.location.origin}).`;
    }

    if (message.includes('idpiframe_initialization_failed')) {
      return `Google OAuth iframe initialization failed for this origin (${window.location.origin}).`;
    }

    if (message.includes('secure_http_required')) {
      return 'Google sign-in requires HTTPS (or localhost for local development).';
    }

    if (message.includes('google identity services did not initialize') || message.includes('failed to load gis')) {
      return 'Google sign-in script did not initialize. Please refresh and retry.';
    }

    if (message.includes('google sign-in timed out')) {
      return 'Google sign-in timed out. Please retry.';
    }

    if (message.includes('invalid authentication response')) {
      return 'Server returned an invalid login response. Please try again.';
    }

    return `Google sign-in failed (${rawMessage}).`;
  }
}

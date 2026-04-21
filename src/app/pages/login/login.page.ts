import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
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
export class LoginPage implements OnInit {
  loading = false;
  errorMessage = '';

  constructor(
    private readonly authService: AuthService,
    private readonly fcmService: FcmService,
    private readonly googleSignInService: GoogleSignInService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      void this.router.navigateByUrl('/dashboard', { replaceUrl: true });
    }
  }

  async continueWithGoogle(): Promise<void> {
    if (this.loading) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      const idToken = await this.googleSignInService.signIn();
      const session = await this.authService.loginWithGoogleToken(idToken);

      // Initialize FCM for Android (fire-and-forget, do not block)
      void this.fcmService.initFCM(session.accessToken);

      await this.router.navigateByUrl('/dashboard', { replaceUrl: true });
    } catch (error) {
      console.error('[Login] Google sign-in failed:', error);

      if (error instanceof HttpErrorResponse && error.status === 403) {
        this.errorMessage = 'Only admin or super admin can access admin panel';
      } else if (error instanceof TimeoutError) {
        this.errorMessage = 'Login timed out. Please check your network and try again.';
      } else if (error instanceof Error) {
        this.errorMessage = this.getGoogleSignInErrorMessage(error.message);
      } else {
        this.errorMessage = 'Google sign-in failed. Please try again.';
      }
    } finally {
      this.loading = false;
    }
  }

  private getGoogleSignInErrorMessage(rawMessage: string): string {
    const message = rawMessage.toLowerCase();

    if (message.includes('suppressed_by_user') || message.includes('tap_outside')) {
      return 'Google prompt was dismissed/suppressed. Please retry after a few seconds.';
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

    if (message.includes('google identity services did not initialize')) {
      return 'Google sign-in script did not initialize. Please refresh and retry.';
    }

    if (message.includes('google sign-in timed out')) {
      return 'Google sign-in timed out. Please retry.';
    }

    return `Google sign-in failed (${rawMessage}).`;
  }
}

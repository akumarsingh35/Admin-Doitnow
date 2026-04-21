import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

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
      if (error instanceof HttpErrorResponse && error.status === 403) {
        this.errorMessage = 'Only admin or super admin can access admin panel';
      } else {
        this.errorMessage = 'Google sign-in failed. Please try again.';
      }
    } finally {
      this.loading = false;
    }
  }
}

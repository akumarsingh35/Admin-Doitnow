import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false,
})
export class SettingsPage {
  readonly title = 'Settings & Configuration';
  readonly description = 'Feature shell for application configuration, preferences, and environment-level settings.';

  loggingOut = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  async logout(): Promise<void> {
    if (this.loggingOut) {
      return;
    }

    this.loggingOut = true;

    try {
      await this.authService.logout();
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    } finally {
      this.loggingOut = false;
    }
  }
}

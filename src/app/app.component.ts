import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { MenuController } from '@ionic/angular';

import { AuthService } from './services/auth.service';
import { FcmService } from './services/fcm.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  readonly bottomNavItems = [
    { path: '/dashboard', icon: 'home-outline', label: 'Home', exact: true },
    { path: '/partners', icon: 'people-outline', label: 'Partners', exact: false },
    { path: '/services', icon: 'cube-outline', label: 'Services', exact: false },
    { path: '/users', icon: 'person-circle-outline', label: 'Users', exact: false },
  ];

  isLoginPage = false;

  constructor(
    private readonly menuController: MenuController,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly fcmService: FcmService,
  ) {
    this.router.events.subscribe(() => {
      this.isLoginPage = this.router.url === '/login';
    });
  }

  async ngOnInit(): Promise<void> {
    // Initialize FCM notifications if user is already authenticated
    if (this.authService.isAuthenticated()) {
      const accessToken = this.authService.getAccessToken();
      if (accessToken) {
        await this.fcmService.initNotifications(accessToken);
      }
    }
  }

  async navigateTo(path: string): Promise<void> {
    await this.menuController.close('settings-menu');
    await this.router.navigateByUrl(path);
  }

  async logout(): Promise<void> {
    await this.menuController.close('settings-menu');

    // Clear FCM token on logout
    this.fcmService.clearToken();

    await this.authService.logout();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}

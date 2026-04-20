import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { MenuController } from '@ionic/angular';

import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
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
  ) {
    this.router.events.subscribe(() => {
      this.isLoginPage = this.router.url === '/login';
    });
  }

  async navigateTo(path: string): Promise<void> {
    await this.menuController.close('settings-menu');
    await this.router.navigateByUrl(path);
  }

  async logout(): Promise<void> {
    await this.menuController.close('settings-menu');
    await this.authService.logout();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}

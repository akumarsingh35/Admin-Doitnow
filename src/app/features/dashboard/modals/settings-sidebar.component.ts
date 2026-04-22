import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Router } from '@angular/router';

import { AuthService } from '../../../services/auth.service';
import { FcmService } from '../../../services/fcm.service';

export interface SettingsMenuItem {
  label: string;
  icon: string;
  path: string;
  description?: string;
}

export interface SettingsMenuSection {
  title: string;
  items: readonly SettingsMenuItem[];
}

@Component({
  selector: 'app-settings-sidebar',
  templateUrl: './settings-sidebar.component.html',
  styleUrls: ['./settings-sidebar.component.scss'],
  standalone: false,
})
export class SettingsSidebarComponent {
  readonly menuSections: readonly SettingsMenuSection[] = [
    {
      title: 'Workspace',
      items: [
        {
          label: 'Dashboard',
          icon: 'grid-outline',
          path: '/dashboard',
          description: 'Overview & key metrics',
        },
        {
          label: 'Requests',
          icon: 'git-network-outline',
          path: '/requests',
          description: 'Queue, approve, and reject',
        },
      ],
    },
    {
      title: 'Directory',
      items: [
        {
          label: 'Users',
          icon: 'people-circle-outline',
          path: '/users',
          description: 'Customer accounts',
        },
        {
          label: 'Partners',
          icon: 'business-outline',
          path: '/partners',
          description: 'Partner network & lifecycle',
        },
        {
          label: 'Services',
          icon: 'cube-outline',
          path: '/services',
          description: 'Catalog & pricing',
        },
      ],
    },
    {
      title: 'Administration',
      items: [
        {
          label: 'Roles & access',
          icon: 'shield-checkmark-outline',
          path: '/roles',
          description: 'Permissions & policies',
        },
        {
          label: 'Analytics',
          icon: 'bar-chart-outline',
          path: '/reports',
          description: 'Reports & KPIs',
        },
        {
          label: 'App settings',
          icon: 'settings-outline',
          path: '/settings',
          description: 'Preferences & configuration',
        },
      ],
    },
  ];

  constructor(
    private readonly modalController: ModalController,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly fcmService: FcmService,
  ) {}

  dismiss(): void {
    void this.modalController.dismiss();
  }

  navigate(path: string): void {
    void this.modalController.dismiss();
    void this.router.navigateByUrl(path);
  }

  async logout(): Promise<void> {
    await this.modalController.dismiss();
    this.fcmService.clearToken();
    await this.authService.logout();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}

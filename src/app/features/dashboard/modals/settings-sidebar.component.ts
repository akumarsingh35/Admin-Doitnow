import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-settings-sidebar',
  templateUrl: './settings-sidebar.component.html',
  styleUrls: ['./settings-sidebar.component.scss'],
  standalone: false,
})
export class SettingsSidebarComponent {
  constructor(
    private readonly modalController: ModalController,
    private readonly router: Router,
  ) {}

  dismiss(): void {
    this.modalController.dismiss();
  }

  navigateToRoles(): void {
    this.dismiss();
    void this.router.navigate(['/roles']);
  }

  navigateToAnalytics(): void {
    this.dismiss();
    void this.router.navigate(['/reports']);
  }

  logout(): void {
    this.dismiss();
    // Implement logout logic
    void this.router.navigate(['/login']);
  }
}

import { Component } from '@angular/core';
import { MenuController } from '@ionic/angular';

/** Opens the app end drawer (`settings-menu`). Use inside `<ion-buttons slot="end">`. */
@Component({
  selector: 'app-header-menu-button',
  templateUrl: './header-menu-button.component.html',
  styleUrls: ['./header-menu-button.component.scss'],
  standalone: false,
})
export class HeaderMenuButtonComponent {
  constructor(private readonly menuController: MenuController) {}

  async openMenu(): Promise<void> {
    await this.menuController.open('settings-menu');
  }
}

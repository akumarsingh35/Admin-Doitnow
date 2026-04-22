import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardPage } from './dashboard.page';
import { SettingsSidebarComponent } from './modals/settings-sidebar.component';

@NgModule({
  imports: [SharedModule, DashboardRoutingModule],
  declarations: [DashboardPage, SettingsSidebarComponent],
})
export class DashboardModule {}

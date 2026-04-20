import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardPage } from './dashboard.page';
import { ApproveBookingModalComponent } from './modals/approve-booking-modal.component';
import { CancelBookingModalComponent } from './modals/cancel-booking-modal.component';
import { SettingsSidebarComponent } from './modals/settings-sidebar.component';

@NgModule({
  imports: [SharedModule, DashboardRoutingModule],
  declarations: [DashboardPage, ApproveBookingModalComponent, CancelBookingModalComponent, SettingsSidebarComponent],
})
export class DashboardModule {}

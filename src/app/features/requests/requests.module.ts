import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { ApproveBookingModalComponent } from './modals/approve-booking-modal.component';
import { CancelBookingModalComponent } from './modals/cancel-booking-modal.component';
import { RequestDetailPage } from './request-detail.page';
import { RequestsRoutingModule } from './requests-routing.module';
import { RequestsPage } from './requests.page';

@NgModule({
  imports: [SharedModule, RequestsRoutingModule],
  declarations: [
    RequestsPage,
    RequestDetailPage,
    ApproveBookingModalComponent,
    CancelBookingModalComponent,
  ],
})
export class RequestsModule {}

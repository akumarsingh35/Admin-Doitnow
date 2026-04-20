import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { RequestsRoutingModule } from './requests-routing.module';
import { RequestsPage } from './requests.page';

@NgModule({
  imports: [SharedModule, RequestsRoutingModule],
  declarations: [RequestsPage],
})
export class RequestsModule {}

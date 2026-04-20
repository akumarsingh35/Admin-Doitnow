import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { ServicesRoutingModule } from './services-routing.module';
import { ServicesPage } from './services.page';

@NgModule({
  imports: [SharedModule, ServicesRoutingModule],
  declarations: [ServicesPage],
})
export class ServicesModule {}

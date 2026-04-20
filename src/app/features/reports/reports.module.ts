import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { ReportsRoutingModule } from './reports-routing.module';
import { ReportsPage } from './reports.page';

@NgModule({
  imports: [SharedModule, ReportsRoutingModule],
  declarations: [ReportsPage],
})
export class ReportsModule {}

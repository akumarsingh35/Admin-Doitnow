import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { RolesRoutingModule } from './roles-routing.module';
import { RolesPage } from './roles.page';

@NgModule({
  imports: [SharedModule, RolesRoutingModule],
  declarations: [RolesPage],
})
export class RolesModule {}

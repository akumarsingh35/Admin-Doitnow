import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { UsersRoutingModule } from './users-routing.module';
import { UsersPage } from './users.page';

@NgModule({
  imports: [SharedModule, UsersRoutingModule],
  declarations: [UsersPage],
})
export class UsersModule {}

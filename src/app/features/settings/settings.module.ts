import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { SettingsRoutingModule } from './settings-routing.module';
import { SettingsPage } from './settings.page';

@NgModule({
  imports: [SharedModule, SettingsRoutingModule],
  declarations: [SettingsPage],
})
export class SettingsModule {}

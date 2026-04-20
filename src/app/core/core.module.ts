import { NgModule, Optional, SkipSelf } from '@angular/core';

import { SessionService } from './services/session.service';

@NgModule({
  providers: [SessionService],
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule?: CoreModule) {
    if (parentModule) {
      throw new Error('CoreModule should only be imported in AppModule.');
    }
  }
}

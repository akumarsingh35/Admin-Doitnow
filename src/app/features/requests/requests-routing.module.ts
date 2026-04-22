import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { RequestDetailPage } from './request-detail.page';
import { RequestsPage } from './requests.page';

const routes: Routes = [
  {
    path: '',
    component: RequestsPage,
  },
  {
    path: ':id',
    component: RequestDetailPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RequestsRoutingModule {}

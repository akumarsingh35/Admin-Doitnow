import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

import { AuthGuard } from './core/guards/auth.guard';
import { GuestGuard } from './core/guards/guest.guard';

const routes: Routes = [
  {
    path: 'login',
    canMatch: [GuestGuard],
    loadChildren: () => import('./pages/login/login.module').then((m) => m.LoginPageModule),
  },
  {
    path: 'dashboard',
    canMatch: [AuthGuard],
    loadChildren: () =>
      import('./features/dashboard/dashboard.module').then((m) => m.DashboardModule),
  },
  {
    path: 'users',
    canMatch: [AuthGuard],
    loadChildren: () => import('./features/users/users.module').then((m) => m.UsersModule),
  },
  {
    path: 'roles',
    canMatch: [AuthGuard],
    loadChildren: () => import('./features/roles/roles.module').then((m) => m.RolesModule),
  },
  {
    path: 'services',
    canMatch: [AuthGuard],
    loadChildren: () =>
      import('./features/services/services.module').then((m) => m.ServicesModule),
  },
  {
    path: 'partners',
    canMatch: [AuthGuard],
    loadChildren: () => import('./features/partners/partners.module').then((m) => m.PartnersModule),
  },
  {
    path: 'requests',
    canMatch: [AuthGuard],
    loadChildren: () =>
      import('./features/requests/requests.module').then((m) => m.RequestsModule),
  },
  {
    path: 'reports',
    canMatch: [AuthGuard],
    loadChildren: () =>
      import('./features/reports/reports.module').then((m) => m.ReportsModule),
  },
  {
    path: 'settings',
    canMatch: [AuthGuard],
    loadChildren: () =>
      import('./features/settings/settings.module').then((m) => m.SettingsModule),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule],
})
export class AppRoutingModule {}

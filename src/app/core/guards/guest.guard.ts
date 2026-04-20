import { Injectable } from '@angular/core';
import { CanMatch, Route, Router, UrlSegment, UrlTree } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class GuestGuard implements CanMatch {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  canMatch(_route: Route, _segments: UrlSegment[]): boolean | UrlTree {
    return this.authService.isAuthenticated() ? this.router.parseUrl('/dashboard') : true;
  }
}

import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

@Injectable()
export class ApiInterceptor implements HttpInterceptor {
  constructor(private readonly authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const accessToken = this.authService.getAccessToken();
    const isApiRequest = request.url.startsWith(environment.apiUrl);
    const includeNgrokHeader = this.shouldIncludeNgrokHeader(request.url);

    if (!isApiRequest) {
      return next.handle(request);
    }

    const apiRequest = request.clone({ setHeaders: this.buildHeaders(accessToken, includeNgrokHeader) });

    if (!includeNgrokHeader) {
      return next.handle(apiRequest);
    }

    return this.handleWithNgrokFallback(apiRequest, next);
  }

  private shouldIncludeNgrokHeader(url: string): boolean {
    return (
      url.includes('ngrok-free.app') ||
      url.includes('.ngrok.io') ||
      environment.apiUrl.includes('ngrok-free.app') ||
      environment.apiUrl.includes('.ngrok.io')
    );
  }

  private handleWithNgrokFallback(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: unknown) => {
        const shouldRetryWithoutNgrokHeader =
          error instanceof HttpErrorResponse && error.status === 0 && this.shouldIncludeNgrokHeader(request.url);

        if (!shouldRetryWithoutNgrokHeader) {
          return throwError(() => error);
        }

        const fallbackRequest = request.clone({
          setHeaders: this.buildHeaders(this.authService.getAccessToken(), false),
        });

        return next.handle(fallbackRequest);
      }),
    );
  }

  private buildHeaders(token: string | null, includeNgrokHeader: boolean): Record<string, string> {
    const setHeaders: Record<string, string> = {};

    if (includeNgrokHeader) {
      setHeaders['ngrok-skip-browser-warning'] = '1';
    }

    if (token) {
      setHeaders['Authorization'] = `Bearer ${token}`;
    }

    return setHeaders;
  }
}

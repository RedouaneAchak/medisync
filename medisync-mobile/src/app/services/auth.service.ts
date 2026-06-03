import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthResponse, AuthUser } from './medisync.models';
import { BiometricAuthService } from './biometric-auth.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'medisync_mobile_token';
  private readonly userKey = 'medisync_mobile_user';

  readonly currentUser = signal<AuthUser | null>(this.readStoredUser());

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly biometricAuthService: BiometricAuthService,
  ) {}

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  get isAuthenticated(): boolean {
    return !!this.token && !!this.currentUser();
  }

  login(identifier: string, password: string, otpCode?: string) {
    return this.http
      .post<AuthResponse>(`${environment.apiBaseUrl}/auth/login`, { identifier, password, otpCode })
      .pipe(tap((response: AuthResponse) => this.storeSession(response)));
  }

  register(
    firstname: string,
    lastname: string,
    email: string,
    password: string,
    phone: string,
    socialSecurityNumber?: string,
  ) {
    return this.http
      .post<AuthResponse>(`${environment.apiBaseUrl}/auth/register`, {
        firstname,
        lastname,
        email,
        password,
        phone,
        socialSecurityNumber,
      })
      .pipe(tap((response: AuthResponse) => this.storeSession(response)));
  }

  logout(navigate = true): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUser.set(null);
    this.biometricAuthService.clearUnlock();

    if (navigate) {
      void this.router.navigate(['/login']);
    }
  }

  private storeSession(response: AuthResponse): void {
    const { token, ...user } = response;
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.currentUser.set(user);
    this.biometricAuthService.markUnlocked();
  }

  private readStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      localStorage.removeItem(this.userKey);
      return null;
    }
  }
}

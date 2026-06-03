import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

import { getRuntimeConfig } from '../core/runtime-config';

export interface AuthUser {
  userId: number;
  firstname: string;
  lastname: string;
  email: string;
  role: 'PATIENT' | 'DOCTOR' | 'SECRETARY' | 'ADMIN';
  permissions?: string[];
}

export interface AuthResponse extends AuthUser {
  token: string;
  twoFactorEnabled?: boolean;
  requiresTwoFactorSetup?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'medisync_token';
  private readonly userKey = 'medisync_user';
  private readonly apiBaseUrl = getRuntimeConfig().apiBaseUrl;

  readonly currentUser = signal<AuthUser | null>(this.readStoredUser());

  constructor(private readonly http: HttpClient) {}

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  login(identifier: string, password: string, otpCode?: string) {
    return this.http.post<AuthResponse>(this.endpoint('/api/auth/login'), { identifier, password, otpCode }).pipe(
      tap((response) => this.storeSession(response)),
    );
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
      .post<AuthResponse>(this.endpoint('/api/auth/register'), {
        firstname,
        lastname,
        email,
        password,
        phone,
        socialSecurityNumber,
      })
      .pipe(tap((response) => this.storeSession(response)));
  }

  loginWithGoogle(idToken: string) {
    return this.http.post<AuthResponse>(this.endpoint('/api/auth/google'), { idToken }).pipe(
      tap((response) => this.storeSession(response)),
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUser.set(null);
  }

  updateCurrentUser(partial: Partial<AuthUser>): void {
    const current = this.currentUser();
    if (!current) {
      return;
    }

    const updated = { ...current, ...partial };
    localStorage.setItem(this.userKey, JSON.stringify(updated));
    this.currentUser.set(updated);
  }

  defaultRouteFor(user: AuthUser | null = this.currentUser()): string {
    if (!user) {
      return '/login';
    }

    switch (user.role) {
      case 'DOCTOR':
        return '/appointments';
      case 'SECRETARY':
        return '/patients';
      case 'ADMIN':
        return '/admin';
      case 'PATIENT':
      default:
        return '/profile';
    }
  }

  private storeSession(response: AuthResponse): void {
    const { token, ...user } = response;
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.currentUser.set(user);
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

  private endpoint(path: string): string {
    return `${this.apiBaseUrl}${path}`;
  }
}

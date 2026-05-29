import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

export interface AuthUser {
  userId: number;
  firstname: string;
  lastname: string;
  email: string;
  role: 'PATIENT' | 'DOCTOR' | 'SECRETARY' | 'ADMIN';
}

export interface AuthResponse extends AuthUser {
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'medisync_token';
  private readonly userKey = 'medisync_user';

  readonly currentUser = signal<AuthUser | null>(this.readStoredUser());

  constructor(private readonly http: HttpClient) {}

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  login(email: string, password: string) {
    return this.http.post<AuthResponse>('/api/auth/login', { email, password }).pipe(
      tap((response) => this.storeSession(response)),
    );
  }

  register(firstname: string, lastname: string, email: string, password: string, phone: string) {
    return this.http.post<AuthResponse>('/api/auth/register', { firstname, lastname, email, password, phone }).pipe(
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
}

import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService, AuthUser } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly publicRoutes = ['/', '/login', '/announcements'];

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
  ) {}

  get isPublicPage(): boolean {
    return this.publicRoutes.includes(this.router.url.split('?')[0]);
  }

  get user(): AuthUser | null {
    return this.authService.currentUser();
  }

  canSee(roles: AuthUser['role'][]): boolean {
    return !!this.user && roles.includes(this.user.role);
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/login');
  }
}

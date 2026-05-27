import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly publicRoutes = ['/', '/login', '/announcements'];

  constructor(private readonly router: Router) {}

  get isPublicPage(): boolean {
    return this.publicRoutes.includes(this.router.url.split('?')[0]);
  }
}

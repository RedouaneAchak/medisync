import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
})
export class Login {
  email = '';
  password = '';
  fullName = '';
  mode: 'signin' | 'signup' = 'signin';
  error = '';
  loading = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {}

  submit(): void {
    this.error = '';
    this.loading = true;

    const request =
      this.mode === 'signin'
        ? this.authService.login(this.email, this.password)
        : this.authService.register(this.firstname, this.lastname, this.email, this.password);

    request.subscribe({
      next: () => void this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') ?? '/profile'),
      error: () => {
        this.error = 'Connexion impossible. Verifiez vos informations et que le backend est demarre.';
        this.loading = false;
      },
    });
  }

  private get firstname(): string {
    return this.fullName.trim().split(' ')[0] || 'Patient';
  }

  private get lastname(): string {
    const parts = this.fullName.trim().split(' ').filter(Boolean);
    return parts.length > 1 ? parts.slice(1).join(' ') : 'MediSync';
  }
}

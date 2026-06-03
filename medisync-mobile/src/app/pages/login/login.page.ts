import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonContent, IonInput } from '@ionic/angular/standalone';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonButton, IonInput],
})
export class LoginPage {
  private static readonly EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;

  fullName = '';
  email = '';
  password = '';
  phone = '';
  mode: 'signin' | 'signup' = 'signin';
  loading = false;
  error = '';

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
  ) {}

  ionViewWillEnter(): void {
    if (this.authService.isAuthenticated) {
      void this.router.navigateByUrl('/home');
    }
  }

  login(): void {
    this.error = '';

    if (!this.validateForm()) {
      return;
    }

    this.loading = true;
    const nameParts = this.fullName.trim().split(' ').filter(Boolean);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'MediSync';
    const email = this.email.trim().toLowerCase();

    const request =
      this.mode === 'signin'
        ? this.authService.login(email, this.password)
        : this.authService.register(firstName, lastName, email, this.password, this.phone.trim());

    request.subscribe({
      next: () => {
        this.loading = false;
        void this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') ?? '/home');
      },
      error: (err: AuthError) => {
        this.loading = false;
        this.error =
          this.extractErrorMessage(err) ??
          (err.status === 400 || err.status === 401 || err.status === 403
            ? this.mode === 'signin'
              ? 'Email ou mot de passe incorrect.'
              : 'Inscription impossible. Vérifiez vos informations.'
            : 'Connexion au backend impossible. Vérifiez que le serveur est démarré.');
      },
    });
  }

  loginBiometric(): void {
    this.error = 'La biométrie peut être branchée ensuite avec un plugin Capacitor. La connexion backend est déjà active.';
  }

  goToRegister(): void {
    this.mode = this.mode === 'signin' ? 'signup' : 'signin';
    this.error = '';
    if (this.mode === 'signin') {
      this.fullName = '';
      this.phone = '';
    }
  }

  private validateForm(): boolean {
    const email = this.email.trim();

    if (!email || !this.password || (this.mode === 'signup' && !this.fullName.trim())) {
      this.error = "Le nom, l'email et le mot de passe sont obligatoires.";
      return false;
    }

    if (!LoginPage.EMAIL_PATTERN.test(email)) {
      this.error = 'Veuillez saisir une adresse email valide.';
      return false;
    }

    if (this.mode === 'signup' && !LoginPage.PASSWORD_PATTERN.test(this.password)) {
      this.error =
        'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.';
      return false;
    }

    return true;
  }

  private extractErrorMessage(err: AuthError): string | null {
    if (typeof err.error === 'string') {
      return err.error;
    }

    if (err.error?.errors) {
      return Object.values(err.error.errors)[0] ?? err.error.message ?? null;
    }

    return err.error?.message ?? null;
  }
}

interface AuthError {
  status?: number;
  error?: {
    message?: string;
    errors?: Record<string, string>;
  } | string;
}

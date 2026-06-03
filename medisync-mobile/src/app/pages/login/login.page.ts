import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonContent, IonInput } from '@ionic/angular/standalone';

import { AuthService } from '../../services/auth.service';
import { BiometricAuthService } from '../../services/biometric-auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonButton, IonInput],
})
export class LoginPage {
  fullName = '';
  email = '';
  password = '';
  otpCode = '';
  phone = '';
  socialSecurityNumber = '';
  mode: 'signin' | 'signup' = 'signin';
  loading = false;
  error = '';
  biometricEnabled = false;
  biometricAvailable = false;
  private readonly passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    public readonly authService: AuthService,
    private readonly biometricAuthService: BiometricAuthService,
  ) {}

  ionViewWillEnter(): void {
    void this.refreshBiometricState();
    if (this.authService.isAuthenticated) {
      if (this.biometricAuthService.needsUnlock(this.authService.isAuthenticated)) {
        this.error = 'Déverrouillez votre session MediSync avec la biométrie.';
        return;
      }
      void this.router.navigateByUrl('/home');
    }
  }

  login(): void {
    this.error = '';

    if (!this.email || !this.password || (this.mode === 'signup' && !this.fullName.trim())) {
      this.error = 'Veuillez remplir les champs requis.';
      return;
    }
    if (this.mode === 'signup' && !this.passwordPattern.test(this.password)) {
      this.error = 'Mot de passe requis: 8 caractères min, 1 majuscule, 1 chiffre et 1 caractère spécial.';
      return;
    }

    this.loading = true;
    const nameParts = this.fullName.trim().split(' ').filter(Boolean);
    const firstName = nameParts[0] ?? 'Patient';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'MediSync';

    const request =
      this.mode === 'signin'
        ? this.authService.login(this.email, this.password, this.otpCode)
        : this.authService.register(
            firstName,
            lastName,
            this.email,
            this.password,
            this.phone,
            this.socialSecurityNumber,
          );

    request.subscribe({
      next: () => {
        this.loading = false;
        void this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') ?? '/home');
      },
      error: (err: { status?: number; error?: { message?: string } | string }) => {
        this.loading = false;
        if (err.status === 400 || err.status === 401 || err.status === 403) {
          this.error =
            this.mode === 'signin'
              ? (typeof err.error === 'string' ? err.error : err.error?.message) ?? 'Identifiant ou mot de passe incorrect.'
              : 'Inscription impossible. Vérifiez vos informations.';
        } else {
          this.error = 'Connexion au backend impossible. Vérifiez que le serveur est démarré.';
        }
      },
    });
  }

  async loginBiometric(): Promise<void> {
    this.error = '';

    if (!this.authService.isAuthenticated) {
      this.error = 'Connectez-vous une première fois pour activer ou utiliser le déverrouillage biométrique.';
      return;
    }

    try {
      await this.biometricAuthService.authenticateForUnlock();
      await this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') ?? '/home');
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Déverrouillage biométrique impossible.';
    }
  }

  goToRegister(): void {
    this.mode = this.mode === 'signin' ? 'signup' : 'signin';
    this.error = '';
    if (this.mode === 'signin') {
      this.fullName = '';
      this.phone = '';
      this.socialSecurityNumber = '';
    }
  }

  private async refreshBiometricState(): Promise<void> {
    this.biometricAvailable = await this.biometricAuthService.refreshAvailability();
    this.biometricEnabled = this.biometricAuthService.isEnabled();
  }
}

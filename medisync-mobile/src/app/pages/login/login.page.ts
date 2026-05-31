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

    if (!this.email || !this.password || (this.mode === 'signup' && !this.fullName.trim())) {
      this.error = 'Veuillez remplir les champs requis.';
      return;
    }

    this.loading = true;
    const nameParts = this.fullName.trim().split(' ').filter(Boolean);
    const firstName = nameParts[0] ?? 'Patient';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'MediSync';

    const request =
      this.mode === 'signin'
        ? this.authService.login(this.email, this.password)
        : this.authService.register(firstName, lastName, this.email, this.password, this.phone);

    request.subscribe({
      next: () => {
        this.loading = false;
        void this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') ?? '/home');
      },
      error: (err: { status?: number }) => {
        this.loading = false;
        if (err.status === 400 || err.status === 401 || err.status === 403) {
          this.error =
            this.mode === 'signin'
              ? 'Email ou mot de passe incorrect.'
              : 'Inscription impossible. Vérifiez vos informations.';
        } else {
          this.error = 'Connexion au backend impossible. Vérifiez que le serveur est démarré.';
        }
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
}

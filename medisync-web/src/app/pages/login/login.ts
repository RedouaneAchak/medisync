import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GoogleAuthService } from '../../services/google-auth.service';
import { GoogleCredentialResponse } from '../../core/google-identity.types';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
})
export class Login {
  @ViewChild('googleButtonHost') googleButtonHost?: ElementRef<HTMLDivElement>;

  email = '';
  password = '';
  otpCode = '';
  fullName = '';
  phone = '';
  socialSecurityNumber = '';
  
  mode: 'signin' | 'signup' = 'signin';
  error = '';
  loading = false;
  googleLoading = false;
  googleEnabled = false;
  private readonly passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly googleAuthService: GoogleAuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit(): void {
    this.googleEnabled = this.googleAuthService.isConfigured;
    if (!this.googleEnabled || !this.googleButtonHost) {
      this.cdr.detectChanges();
      return;
    }

    void this.googleAuthService
      .renderButton(this.googleButtonHost.nativeElement, (response) => this.handleGoogleCredential(response))
      .then(() => this.googleAuthService.prompt())
      .catch((error: unknown) => {
        console.error('Google button render failed:', error);
        this.error = 'Connexion Google indisponible pour le moment.';
        this.cdr.detectChanges();
      });
  }

  submit(): void {
    this.error = '';

    if (!this.email || !this.password || (this.mode === 'signup' && !this.fullName.trim())) {
      this.error = 'Veuillez renseigner les champs requis.';
      return;
    }
    if (this.mode === 'signup' && !this.passwordPattern.test(this.password)) {
      this.error = 'Le mot de passe doit contenir 8 caractères minimum, une majuscule, un chiffre et un caractère spécial.';
      return;
    }

    this.loading = true;

    const firstName = this.fullName.trim().split(' ')[0] || 'Patient';
    const parts = this.fullName.trim().split(' ').filter(Boolean);
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : 'MediSync';

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
        this.cdr.detectChanges();
        void this.router.navigateByUrl(
          this.route.snapshot.queryParamMap.get('returnUrl') ?? this.authService.defaultRouteFor(),
        );
      },
      error: (err) => {
        this.loading = false;
        console.error('Login Failed:', err);

        if (err.status === 401 || err.status === 403 || err.status === 400) {
            this.error =
              this.mode === 'signin'
                ? err.error?.message ?? 'Identifiant ou mot de passe incorrect. Veuillez réessayer.'
                : err.error?.message ?? 'Inscription impossible. Vérifiez vos informations.';
        } else {
            this.error = 'Erreur serveur. Vérifiez que le backend est démarré.';
        }
        
        this.cdr.detectChanges();
      },
    });
  }

  private handleGoogleCredential(response: GoogleCredentialResponse): void {
    if (!response.credential) {
      this.error = 'Réponse Google invalide.';
      this.cdr.detectChanges();
      return;
    }

    this.error = '';
    this.googleLoading = true;

    this.authService.loginWithGoogle(response.credential).subscribe({
      next: () => {
        this.googleLoading = false;
        this.cdr.detectChanges();
        void this.router.navigateByUrl(
          this.route.snapshot.queryParamMap.get('returnUrl') ?? this.authService.defaultRouteFor(),
        );
      },
      error: (err) => {
        this.googleLoading = false;
        console.error('Google login failed:', err);
        this.error =
          err.error?.message ??
          (typeof err.error === 'string' ? err.error : 'Connexion Google impossible. Vérifiez la configuration.');
        this.cdr.detectChanges();
      },
    });
  }
}

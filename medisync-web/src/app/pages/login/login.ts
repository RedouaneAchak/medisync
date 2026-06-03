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
export class Login implements AfterViewInit {
  private static readonly EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;

  private googleButtonHost?: HTMLDivElement;

  @ViewChild('googleButtonHost')
  set googleButtonHostRef(ref: ElementRef<HTMLDivElement> | undefined) {
    this.googleButtonHost = ref?.nativeElement;
    this.renderGoogleButton();
  }

  email = '';
  password = '';
  fullName = '';
  phone = '';

  mode: 'signin' | 'signup' = 'signin';
  error = '';
  loading = false;
  googleLoading = false;
  googleEnabled = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly googleAuthService: GoogleAuthService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngAfterViewInit(): void {
    this.googleEnabled = this.googleAuthService.isConfigured;
    this.cdr.detectChanges();
    this.renderGoogleButton();
  }

  submit(): void {
    this.error = '';

    if (!this.validateForm()) {
      return;
    }

    this.loading = true;
    const parts = this.fullName.trim().split(' ').filter(Boolean);
    const firstName = parts[0] || '';
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : 'MediSync';
    const email = this.email.trim().toLowerCase();

    const request =
      this.mode === 'signin'
        ? this.authService.login(email, this.password)
        : this.authService.register(firstName, lastName, email, this.password, this.phone.trim());

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
        this.error =
          this.extractErrorMessage(err) ??
          (this.mode === 'signin'
            ? 'Email ou mot de passe incorrect. Veuillez réessayer.'
            : 'Inscription impossible. Vérifiez vos informations.');
        this.cdr.detectChanges();
      },
    });
  }

  setMode(mode: 'signin' | 'signup'): void {
    if (this.mode === mode) {
      return;
    }

    this.mode = mode;
    this.error = '';
    this.renderGoogleButton();
  }

  showGoogleConfigHelp(): void {
    this.error =
      'Google Sign-In doit être configuré avec un client ID Google dans public/runtime-config.js et GOOGLE_CLIENT_ID côté backend.';
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
        this.error = this.extractErrorMessage(err) ?? 'Connexion Google impossible. Vérifiez la configuration.';
        this.cdr.detectChanges();
      },
    });
  }

  private validateForm(): boolean {
    const email = this.email.trim();

    if (!email || !this.password || (this.mode === 'signup' && !this.fullName.trim())) {
      this.error = "Le nom, l'email et le mot de passe sont obligatoires.";
      return false;
    }

    if (!Login.EMAIL_PATTERN.test(email)) {
      this.error = 'Veuillez saisir une adresse email valide.';
      return false;
    }

    if (this.mode === 'signup' && !Login.PASSWORD_PATTERN.test(this.password)) {
      this.error =
        'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.';
      return false;
    }

    return true;
  }

  private renderGoogleButton(): void {
    if (!this.googleEnabled || !this.googleButtonHost) {
      return;
    }

    void this.googleAuthService
      .renderButton(this.googleButtonHost, (response) => this.handleGoogleCredential(response), {
        text: this.mode === 'signup' ? 'signup_with' : 'signin_with',
      })
      .then(() => this.googleAuthService.prompt())
      .catch((error: unknown) => {
        console.error('Google button render failed:', error);
        this.error = 'Connexion Google indisponible pour le moment.';
        this.cdr.detectChanges();
      });
  }

  private extractErrorMessage(err: unknown): string | null {
    const error = err as { error?: { message?: string; errors?: Record<string, string> } | string };
    if (typeof error.error === 'string') {
      return error.error;
    }

    if (error.error?.errors) {
      return Object.values(error.error.errors)[0] ?? error.error.message ?? null;
    }

    return error.error?.message ?? null;
  }
}

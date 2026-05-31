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
    this.loading = true;

    const firstName = this.fullName.trim().split(' ')[0] || 'Patient';
    const parts = this.fullName.trim().split(' ').filter(Boolean);
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : 'MediSync';

    const request =
      this.mode === 'signin'
        ? this.authService.login(this.email, this.password)
        : this.authService.register(firstName, lastName, this.email, this.password, this.phone);

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
            this.error = 'Email ou mot de passe incorrect. Veuillez réessayer.';
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

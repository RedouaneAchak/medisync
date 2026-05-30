import { Component, ChangeDetectorRef, OnInit } from '@angular/core'; // <-- 1. Import OnInit
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
})
export class Login implements OnInit { // <-- 2. Add implements OnInit
  email = '';
  password = '';
  fullName = '';
  phone = '';
  
  mode: 'signin' | 'signup' = 'signin';
  error = '';
  loading = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  // --- 3. ADD THIS ENTIRE METHOD TO CATCH THE GOOGLE TOKEN ---
  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      
      if (token) {
        console.log("Token JWT reçu de Google !");
        
        // Save the token. Make sure the key ('token') matches what your AuthService/Interceptor expects!
        localStorage.setItem('token', token); 
        
        // Force the UI to update and navigate securely to the profile
        this.cdr.detectChanges();
        void this.router.navigateByUrl('/profile');
      }
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
        void this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') ?? '/profile');
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

  loginWithGoogle(): void {
    window.location.href = 'https://localhost:8443/oauth2/authorization/google';
  }
}
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  email = 'patient@medisync.ma';
  fullName = '';
  mode: 'signin' | 'signup' = 'signin';
}

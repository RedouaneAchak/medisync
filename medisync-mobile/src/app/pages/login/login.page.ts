import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonButton, IonInput
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonButton, IonInput]
})
export class LoginPage {

  email: string = '';
  password: string = '';

  constructor(private router: Router) {}

  login() {
    // Pour l'instant on navigue directement (mock)
    // Plus tard : appel API backend
    if (this.email && this.password) {
      this.router.navigate(['/home']);
    } else {
      alert('Veuillez remplir tous les champs');
    }
  }

  loginBiometric() {
    // À implémenter avec le plugin Capacitor biométrie
    this.router.navigate(['/home']);
  }

  goToRegister() {
    // À créer plus tard
    alert('Page inscription à venir');
  }
}

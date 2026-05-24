import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { TabBarComponent } from '../../shared/tab-bar/tab-bar.component';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, TabBarComponent]
})
export class ProfilePage {

  notifEnabled: boolean = true;
  bioEnabled: boolean = false;

  persons = [
    { name: 'Yasmine Benkirane', relation: 'Fille', age: '8 ans', initials: 'YB', avatarBg: '#fce7f3', avatarColor: '#9d174d' },
    { name: 'Ahmed Benkirane', relation: 'Père', age: '58 ans', initials: 'AB', avatarBg: '#fef3c7', avatarColor: '#92400e' },
  ];

  constructor(private router: Router) {}

  addPerson() {
    alert('Ajouter une personne rattachée — à implémenter');
  }

  logout() {
    this.router.navigate(['/login']);
  }
}

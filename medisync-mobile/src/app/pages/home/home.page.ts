import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { TabBarComponent } from '../../shared/tab-bar/tab-bar.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, TabBarComponent]
})
export class HomePage {

  constructor(private router: Router) {}

  goToSearch() { this.router.navigate(['/search']); }
  goToDossier() { this.router.navigate(['/dossier']); }
  goToAppointments() { this.router.navigate(['/appointments']); }
  goToNotifications() { this.router.navigate(['/notifications']); }
  goToBooking() { this.router.navigate(['/booking']); }
}

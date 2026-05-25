import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { TabBarComponent } from '../../shared/tab-bar/tab-bar.component';

@Component({
  selector: 'app-appointments',
  templateUrl: './appointments.page.html',
  styleUrls: ['./appointments.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, TabBarComponent]
})
export class AppointmentsPage {

  activeTab: string = 'upcoming';

  upcomingRdv = [
    {
      doctor: 'Dr. Sara Benali',
      specialty: 'Cardiologue',
      date: '10 juin 2026',
      time: '09:30',
      location: 'Clinique Atlas',
      statusLabel: 'Confirmé',
      statusClass: 'pill-green',
      initials: 'SB',
      avatarBg: '#dbeafe',
      avatarColor: '#1565C0'
    },
    {
      doctor: 'Dr. Karim Fassi',
      specialty: 'Généraliste',
      date: '18 juin 2026',
      time: '14:00',
      location: 'Cabinet Fassi',
      statusLabel: 'En attente',
      statusClass: 'pill-yellow',
      initials: 'KF',
      avatarBg: '#fef3c7',
      avatarColor: '#92400e'
    }
  ];

  pastRdv = [
    {
      doctor: 'Dr. Nadia Moussaoui',
      specialty: 'Pédiatre',
      date: '5 avril 2026',
      time: '10:00',
      statusLabel: 'Terminé',
      statusClass: 'pill-gray',
      initials: 'NM',
      avatarBg: '#dcfce7',
      avatarColor: '#166534'
    },
    {
      doctor: 'Dr. Sara Benali',
      specialty: 'Cardiologue',
      date: '12 mars 2026',
      time: '09:00',
      statusLabel: 'Terminé',
      statusClass: 'pill-gray',
      initials: 'SB',
      avatarBg: '#dbeafe',
      avatarColor: '#1565C0'
    }
  ];

  constructor(private router: Router) {}

  cancelRdv(rdv: any) {
    alert(`RDV annulé avec ${rdv.doctor}`);
  }

  reschedule(rdv: any) {
    this.router.navigate(['/booking']);
  }

  newRdv(rdv: any) {
    this.router.navigate(['/booking']);
  }
}

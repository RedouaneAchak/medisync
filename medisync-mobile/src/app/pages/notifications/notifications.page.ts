import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';
import { TabBarComponent } from '../../shared/tab-bar/tab-bar.component';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, TabBarComponent]
})
export class NotificationsPage {

  todayNotifs = [
    {
      icon: '📅',
      iconBg: '#dbeafe',
      title: 'Rappel de rendez-vous',
      body: 'Votre RDV avec Dr. Sara Benali est demain à 09:30',
      time: 'Il y a 1 heure',
      read: false
    },
    {
      icon: '✅',
      iconBg: '#dcfce7',
      title: 'RDV confirmé',
      body: 'Dr. Karim Fassi a confirmé votre rendez-vous du 18 juin',
      time: 'Il y a 3 heures',
      read: false
    }
  ];

  weekNotifs = [
    {
      icon: '💊',
      iconBg: '#fef3c7',
      title: 'Rappel médicament',
      body: 'N\'oubliez pas de prendre votre Kardégic 75mg ce matin',
      time: 'Hier, 08:00',
      read: true
    },
    {
      icon: '📄',
      iconBg: '#ede9fe',
      title: 'Ordonnance disponible',
      body: 'Dr. Sara Benali a ajouté une ordonnance à votre dossier',
      time: 'Lundi, 14:30',
      read: true
    },
    {
      icon: '⭐',
      iconBg: '#fce7f3',
      title: 'Donnez votre avis',
      body: 'Comment s\'est passée votre consultation avec Dr. Moussaoui ?',
      time: 'Dimanche, 10:00',
      read: true
    }
  ];

  markRead(notif: any) {
    notif.read = true;
  }
}

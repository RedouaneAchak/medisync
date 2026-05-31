import { Component } from '@angular/core';

@Component({
  selector: 'app-announcements',
  templateUrl: './announcements.html',
})
export class Announcements {
  announcements = [
    {
      category: 'Information patients',
      date: '7 juin 2026',
      title: 'Nouvelle organisation des visites',
      text: 'Les visites en hospitalisation generale sont ouvertes de 12:00 a 14:00 et de 17:00 a 19:00.',
      tone: 'blue',
    },
    {
      category: 'Prevention',
      date: '30 mai 2026',
      title: 'Journee depistage cardio-metabolique',
      text: 'Une equipe medicale accueillera les patients sur rendez-vous pour un bilan rapide et des conseils personnalises.',
      tone: 'green',
    },
    {
      category: 'Travaux',
      date: '30 mars 2026',
      title: 'Acces parking temporairement modifie',
      text: 'L entree nord sera reservee aux ambulances. Les visiteurs sont invites a utiliser l entree principale.',
      tone: 'yellow',
    },
  ];
}

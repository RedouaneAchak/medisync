import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { appointments, doctors, invoices, notifications } from '../../data/medisync-data';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
})
export class Home {
  appointments = appointments;
  doctors = doctors;
  invoices = invoices;
  notifications = notifications;

  stats = [
    { label: 'Rendez-vous aujourdhui', value: '24', helper: '+8 confirmes ce matin' },
    { label: 'Patients actifs', value: '1 248', helper: '3 conventions entreprises' },
    { label: 'Factures ouvertes', value: '12', helper: '3 en attente assurance' },
    { label: 'Temps moyen accueil', value: '7 min', helper: 'objectif sous 10 min' },
  ];
}

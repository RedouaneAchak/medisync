import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { TabBarComponent } from '../../shared/tab-bar/tab-bar.component';

@Component({
  selector: 'app-dossier',
  templateUrl: './dossier.page.html',
  styleUrls: ['./dossier.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, TabBarComponent]
})
export class DossierPage {

  consultations = [
    { date: '5 avril 2026', doctor: 'Dr. Nadia Moussaoui', motif: 'Suivi pédiatrique', type: 'Suivi' },
    { date: '12 mars 2026', doctor: 'Dr. Sara Benali', motif: 'Contrôle cardiaque', type: 'Contrôle' },
    { date: '20 jan 2026', doctor: 'Dr. Karim Fassi', motif: 'Consultation générale', type: 'Général' },
  ];

  ordonnances = [
    { title: 'Ordonnance — Cardio', date: '12 mars 2026', doctor: 'Dr. Sara Benali' },
    { title: 'Ordonnance — Pédiatrie', date: '5 avril 2026', doctor: 'Dr. Moussaoui' },
  ];

  treatments = [
    { name: 'Kardégic 75mg', dose: '1 comprimé/jour', frequency: 'Matin' },
    { name: 'Amlodipine 5mg', dose: '1 comprimé/jour', frequency: 'Soir' },
  ];

  documents = [
    { name: 'Radio thorax.pdf', date: '10 mars 2026', icon: '🫁' },
    { name: 'Analyse sang.pdf', date: '8 jan 2026', icon: '🧪' },
  ];

  constructor(private router: Router) {}

  downloadOrdo(o: any) {
    alert(`Téléchargement : ${o.title}`);
  }

  uploadDocument() {
    alert('Fonctionnalité upload — à connecter avec Capacitor');
  }
}

import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BackendClinicProfile, MedisyncApiService } from '../../services/medisync-api.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  clinicProfile: BackendClinicProfile | null = null;
  doctorSchedules = [
    { service: 'Medecine generale', days: 'Lundi - Vendredi', time: '08:30 - 18:00' },
    { service: 'Cardiologie', days: 'Lundi, Mercredi, Vendredi', time: '09:00 - 16:30' },
    { service: 'Pediatrie', days: 'Mardi - Samedi', time: '09:00 - 17:00' },
    { service: 'Urgences', days: 'Tous les jours', time: '24h/24' },
  ];

  visitHours = [
    { unit: 'Hospitalisation generale', time: '12:00 - 14:00 / 17:00 - 19:00' },
    { unit: 'Maternite', time: '11:00 - 13:00 / 16:00 - 19:00' },
    { unit: 'Soins intensifs', time: 'Sur autorisation medicale' },
  ];

  keyFigures = [
    { value: '68', label: 'medecins partenaires' },
    { value: '12k+', label: 'patients accompagnes' },
    { value: '140', label: 'chambres disponibles' },
    { value: '18', label: 'specialites medicales' },
  ];

  hospitalRules = [
    'Respecter les horaires de visite et les consignes du personnel soignant.',
    'Presenter une piece d identite et la confirmation du rendez-vous a l accueil.',
    'Limiter les visites a deux personnes par patient en chambre.',
    'Garder le telephone en mode silencieux dans les zones de soins.',
    'Les documents medicaux doivent etre deposes uniquement dans l espace patient securise.',
  ];

  hospitalPhotos = [
    {
      src: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1200',
      alt: 'Reception claire et moderne dans un hopital',
      title: 'Accueil fluide',
      text: 'Orientation rapide des patients, verification des rendez-vous et suivi des passages.',
    },
    {
      src: 'https://images.unsplash.com/photo-1516841273335-e39b37888115?auto=format&fit=crop&q=80&w=1200',
      alt: 'Equipe medicale marchant dans un couloir hospitalier',
      title: 'Equipes coordonnees',
      text: 'Medecins, secretaires et administrateurs partagent une meme vision du planning.',
    },
    {
      src: 'https://images.unsplash.com/photo-1764727291644-5dcb0b1a0375?auto=format&fit=crop&q=80&w=1200',
      alt: 'Bureau de reception medicale avec signaletique',
      title: 'Parcours patient',
      text: 'Reservation, dossier medical, rappels et factures accessibles dans un seul espace.',
    },
  ];

  highlights = [
    { value: '24/7', label: 'acces aux demandes et rappels patients' },
    { value: '140', label: 'chambres gerees dans la plateforme' },
    { value: '18', label: 'specialites medicales referencees' },
  ];

  constructor(private readonly api: MedisyncApiService) {}

  ngOnInit(): void {
    this.api.getClinicProfile().subscribe({
      next: (profile) => {
        this.clinicProfile = profile;
        this.applyClinicProfile(profile);
      },
    });
  }

  private applyClinicProfile(profile: BackendClinicProfile): void {
    const specialties = profile.specialtiesOffered
      ?.split(/[\n,;]+/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (specialties?.length) {
      this.doctorSchedules = specialties.slice(0, 4).map((specialty) => ({
        service: specialty,
        days: 'Selon disponibilite de la clinique',
        time: profile.openingHours?.trim() || 'Horaires a confirmer',
      }));
    }

    if (profile.openingHours?.trim()) {
      this.visitHours = [
        { unit: 'Accueil principal', time: profile.openingHours.trim() },
        { unit: 'Secretariat medical', time: profile.openingHours.trim() },
        { unit: 'Orientation patient', time: 'Sur rendez-vous et admission' },
      ];
    }
  }
}

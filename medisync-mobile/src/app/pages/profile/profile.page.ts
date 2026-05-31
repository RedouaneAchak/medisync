import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent } from '@ionic/angular/standalone';

import { TabBarComponent } from '../../shared/tab-bar/tab-bar.component';
import { AuthService } from '../../services/auth.service';
import { MedisyncApiService } from '../../services/medisync-api.service';
import { BackendPatient } from '../../services/medisync.models';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, TabBarComponent],
})
export class ProfilePage {
  notifEnabled = true;
  bioEnabled = false;
  displayName = 'Patient MediSync';
  email = '';
  phone = 'Téléphone non renseigné';
  category = 'PATIENT';
  company = 'Individuel';
  ssn = 'Non renseigné';
  initials = 'MS';
  error = '';

  persons: Array<{ name: string; relation: string; age: string; initials: string; avatarBg: string; avatarColor: string }> = [];

  constructor(
    private readonly authService: AuthService,
    private readonly api: MedisyncApiService,
  ) {}

  ionViewWillEnter(): void {
    this.loadProfile();
  }

  addPerson(): void {
    alert('Le rattachement d’un enfant ou dépendant se gère depuis votre dossier patient ou via le secrétariat.');
  }

  logout(): void {
    this.authService.logout();
  }

  private loadProfile(): void {
    const user = this.authService.currentUser();
    if (!user) {
      this.authService.logout();
      return;
    }

    this.api.getPatientProfile(user.userId).subscribe({
      next: (profile: BackendPatient) => {
        this.applyProfile(profile);
      },
      error: () => {
        this.error = 'Impossible de charger votre profil.';
      },
    });

    this.api.getDependents(user.userId).subscribe({
      next: (dependents: BackendPatient[]) => {
        const palette = [
          { bg: '#fce7f3', color: '#9d174d' },
          { bg: '#fef3c7', color: '#92400e' },
          { bg: '#dbeafe', color: '#1565C0' },
        ];

        this.persons = dependents.map((patient, index) => {
          const firstName = patient.firstName ?? patient.user?.firstname ?? 'Patient';
          const lastName = patient.lastName ?? patient.user?.lastname ?? `${patient.id}`;
          const colors = palette[index % palette.length];
          return {
            name: `${firstName} ${lastName}`.trim(),
            relation: patient.category === 'MINOR' ? 'Mineur rattaché' : 'Personne dépendante',
            age: patient.category ?? 'Dépendant',
            initials: `${firstName[0] ?? 'P'}${lastName[0] ?? 'D'}`.toUpperCase(),
            avatarBg: colors.bg,
            avatarColor: colors.color,
          };
        });
      },
    });
  }

  private applyProfile(profile: BackendPatient): void {
    const firstName = profile.firstName ?? profile.user?.firstname ?? 'Patient';
    const lastName = profile.lastName ?? profile.user?.lastname ?? 'MediSync';
    this.displayName = `${firstName} ${lastName}`.trim();
    this.email = profile.user?.email ?? this.authService.currentUser()?.email ?? '';
    this.phone = profile.phoneNumber ?? 'Téléphone non renseigné';
    this.category = profile.category ?? 'PATIENT';
    this.company = profile.companyName ?? 'Individuel';
    this.ssn = profile.socialSecurityNumber ?? 'Non renseigné';
    this.initials = `${firstName[0] ?? 'M'}${lastName[0] ?? 'S'}`.toUpperCase();
  }
}

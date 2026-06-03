import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';

import { TabBarComponent } from '../../shared/tab-bar/tab-bar.component';
import { AuthService } from '../../services/auth.service';
import { BiometricAuthService } from '../../services/biometric-auth.service';
import { MedisyncApiService } from '../../services/medisync-api.service';
import { BackendAppointment, BackendPatient, BackendPatientFeedback } from '../../services/medisync.models';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, TabBarComponent],
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
  biometricInfo = '';
  feedbackInfo = '';
  pastAppointments: BackendAppointment[] = [];
  feedbackItems: BackendPatientFeedback[] = [];
  feedbackForm = {
    appointmentId: 0,
    type: 'REVIEW' as 'REVIEW' | 'COMPLAINT',
    rating: 5,
    title: '',
    message: '',
  };

  persons: Array<{ name: string; relation: string; age: string; initials: string; avatarBg: string; avatarColor: string }> = [];

  constructor(
    private readonly authService: AuthService,
    private readonly biometricAuthService: BiometricAuthService,
    private readonly api: MedisyncApiService,
  ) {}

  ionViewWillEnter(): void {
    void this.loadBiometricSettings();
    this.loadProfile();
    this.loadFeedbackData();
  }

  addPerson(): void {
    alert('Le rattachement d’un enfant ou dépendant se gère depuis votre dossier patient ou via le secrétariat.');
  }

  logout(): void {
    this.authService.logout();
  }

  async toggleBiometric(): Promise<void> {
    this.error = '';
    this.biometricInfo = '';

    try {
      if (this.bioEnabled) {
        await this.biometricAuthService.setEnabled(false);
        this.bioEnabled = false;
        this.biometricInfo = 'Déverrouillage biométrique désactivé.';
        return;
      }

      await this.biometricAuthService.authenticateForUnlock();
      await this.biometricAuthService.setEnabled(true);
      this.bioEnabled = true;
      this.biometricInfo = 'Déverrouillage biométrique activé pour les prochaines ouvertures de session.';
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Activation biométrique impossible.';
      this.bioEnabled = this.biometricAuthService.isEnabled();
    }
  }

  submitFeedback(): void {
    const user = this.authService.currentUser();
    const selectedAppointment = this.pastAppointments.find((appointment) => appointment.id === this.feedbackForm.appointmentId);
    const doctorId = selectedAppointment?.doctor?.id;

    if (!user || !doctorId) {
      this.error = 'Choisissez un rendez-vous passé avant d envoyer un avis.';
      return;
    }
    if (!this.feedbackForm.title.trim() && !this.feedbackForm.message.trim()) {
      this.error = 'Ajoutez un titre ou un message.';
      return;
    }

    this.api.createPatientFeedback(user.userId, {
      appointmentId: this.feedbackForm.appointmentId || undefined,
      doctorId,
      type: this.feedbackForm.type,
      rating: this.feedbackForm.type === 'REVIEW' ? this.feedbackForm.rating : undefined,
      title: this.feedbackForm.title,
      message: this.feedbackForm.message,
    }).subscribe({
      next: () => {
        this.error = '';
        this.feedbackInfo = this.feedbackForm.type === 'REVIEW' ? 'Avis envoyé.' : 'Réclamation envoyée.';
        this.feedbackForm = {
          appointmentId: 0,
          type: 'REVIEW',
          rating: 5,
          title: '',
          message: '',
        };
        this.loadFeedbackData();
      },
      error: (error: { error?: { message?: string } | string }) => {
        this.feedbackInfo = '';
        this.error = typeof error.error === 'string' ? error.error : error.error?.message ?? 'Envoi impossible.';
      },
    });
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

  formatFeedbackDate(value?: string): string {
    if (!value) {
      return 'Date indisponible';
    }
    return new Date(value).toLocaleDateString('fr-MA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
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

  private async loadBiometricSettings(): Promise<void> {
    this.bioEnabled = this.biometricAuthService.isEnabled();
    const available = await this.biometricAuthService.refreshAvailability();
    if (!available) {
      this.biometricInfo = 'Biométrie indisponible sur cet appareil.';
    } else if (this.bioEnabled) {
      this.biometricInfo = 'Le déverrouillage biométrique est actif pour cette session mobile.';
    } else {
      this.biometricInfo = 'Vous pouvez protéger l accès à la session mémorisée avec la biométrie.';
    }
  }

  private loadFeedbackData(): void {
    const user = this.authService.currentUser();
    if (!user) {
      return;
    }

    this.api.getPatientAppointments(user.userId).subscribe({
      next: (appointments: BackendAppointment[]) => {
        this.pastAppointments = appointments.filter((appointment) => new Date(appointment.dateTime).getTime() <= Date.now());
      },
    });

    this.api.getPatientFeedback(user.userId).subscribe({
      next: (items: BackendPatientFeedback[]) => {
        this.feedbackItems = items;
      },
    });
  }
}

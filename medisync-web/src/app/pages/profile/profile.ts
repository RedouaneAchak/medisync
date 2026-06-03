import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { AuthService, AuthUser } from '../../services/auth.service';
import {
  BackendAppointment,
  BackendDoctor,
  BackendDoctorUnavailability,
  BackendPatient,
  BackendPatientFeedback,
  MedisyncApiService,
} from '../../services/medisync-api.service';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, FormsModule],
  standalone: true,
  templateUrl: './profile.html',
})
export class Profile {
  firstName = '';
  lastName = '';
  phone = '';
  email = '';
  socialSecurityNumber = '';
  category = 'ADULT';
  companyName = '';
  allergies = '';
  medicalAntecedents = '';
  currentTreatments = '';
  guardianId: number | null = null;
  
  specialty = '';
  bio = '';
  spokenLanguages = '';
  standardConsultationRate = 300;
  availabilityStart = '08:00';
  availabilityEnd = '18:00';
  workingDays = 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY';
  defaultSlotMinutes = 30;
  patientAppointments: BackendAppointment[] = [];
  patientFeedback: BackendPatientFeedback[] = [];
  feedbackForm = {
    appointmentId: 0,
    doctorId: 0,
    type: 'REVIEW' as 'REVIEW' | 'COMPLAINT',
    rating: 5,
    title: '',
    message: '',
  };
  doctorUnavailabilities: BackendDoctorUnavailability[] = [];
  unavailabilityForm = {
    startDateTime: '',
    endDateTime: '',
    reason: '',
    type: 'LEAVE',
  };

  loading = false;
  saving = false;
  error = '';
  success = '';

  private user: AuthUser | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly api: MedisyncApiService,
  ) {
    this.user = this.authService.currentUser();
    if (this.user) {
      this.firstName = this.user.firstname;
      this.lastName = this.user.lastname;
      this.email = this.user.email;
      this.loadProfile();
    }
  }

  private get currentUserId(): number {
    return this.user?.userId ?? 0;
  }

  get isPatient(): boolean {
    return this.user?.role === 'PATIENT';
  }

  get isDoctor(): boolean {
    return this.user?.role === 'DOCTOR';
  }

  save(): void {
    // Reset both messages when the user clicks save
    this.error = '';
    this.success = '';

    if (!this.user) {
      this.error = 'Utilisateur non identifié.';
      return;
    }

    if (this.isDoctor) {
      this.saveDoctorProfile(this.user);
      return;
    }

    if (this.isPatient) {
      this.savePatientProfile(this.user);
      return;
    }

    this.error = 'Seuls les patients et médecins peuvent modifier ce profil ici.';
  }

  private loadProfile(): void {
    if (!this.user || (!this.isPatient && !this.isDoctor)) {
      return;
    }

    this.loading = true;
    if (this.isDoctor) {
      this.api
        .getDoctorProfile(this.currentUserId)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: (profile) => this.applyDoctorProfile(profile),
          error: () => {
            this.error = 'Chargement du profil impossible.';
          },
        });
      this.loadDoctorUnavailabilities();
      return;
    }

    this.api
      .getPatientProfile(this.currentUserId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (profile) => this.applyPatientProfile(profile),
        error: () => {
          this.error = 'Chargement du profil impossible.';
        },
      });
    this.loadPatientAppointments();
    this.loadPatientFeedback();
  }

  private savePatientProfile(user: AuthUser): void {
    this.saving = true;

    this.api
      .updatePatientProfile(this.currentUserId, {
        firstName: this.firstName,
        lastName: this.lastName,
        phoneNumber: this.phone,
        socialSecurityNumber: this.socialSecurityNumber,
        category: this.category,
        companyName: this.companyName,
        allergies: this.allergies,
        medicalAntecedents: this.medicalAntecedents,
        currentTreatments: this.currentTreatments,
        guardian: this.needsGuardian && this.guardianId ? { id: this.guardianId } : undefined,
        user: {
          id: this.currentUserId,
          firstname: this.firstName,
          lastname: this.lastName,
          email: this.email,
          role: user.role,
        },
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (patient) => {
          const firstname = patient.firstName ?? patient.user?.firstname ?? this.firstName;
          const lastname = patient.lastName ?? patient.user?.lastname ?? this.lastName;
          const email = patient.user?.email ?? this.email;
          this.authService.updateCurrentUser({ firstname, lastname, email });
          
          this.error = ''; // Force clear error
          this.success = 'Profil patient enregistré avec succès.';
        },
        error: (err: any) => {
          this.success = ''; // Force clear success
          this.error = 'Enregistrement impossible.';
        },
      });
  }

  private saveDoctorProfile(user: AuthUser): void {
    this.saving = true;
    
    this.api
      .updateDoctorProfile(this.currentUserId, {
        specialty: this.specialty,
        bio: this.bio,
        spokenLanguages: this.spokenLanguages,
        standardConsultationRate: this.standardConsultationRate,
        availabilityStart: this.availabilityStart,
        availabilityEnd: this.availabilityEnd,
        workingDays: this.workingDays,
        defaultSlotMinutes: this.defaultSlotMinutes,
        user: {
          id: this.currentUserId,
          firstname: this.firstName,
          lastname: this.lastName,
          email: this.email,
          role: user.role,
        },
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (doctor) => {
          const firstname = doctor.user?.firstname ?? this.firstName;
          const lastname = doctor.user?.lastname ?? this.lastName;
          const email = doctor.user?.email ?? this.email;
          this.authService.updateCurrentUser({ firstname, lastname, email });
          
          this.error = ''; // Force clear error
          this.success = 'Profil médecin enregistré avec succès.';
        },
        error: (err: any) => {
          this.success = ''; // Force clear success
          
          if (err.error && typeof err.error === 'string') {
            this.error = err.error;
          } else if (err.error?.message) {
            this.error = err.error.message;
          } else {
            this.error = 'Enregistrement impossible.';
          }
        },
      });
  }

  private applyPatientProfile(profile: BackendPatient): void {
    this.firstName = profile.firstName ?? profile.user?.firstname ?? this.firstName;
    this.lastName = profile.lastName ?? profile.user?.lastname ?? this.lastName;
    this.phone = profile.phoneNumber ?? '';
    this.email = profile.user?.email ?? this.email;
    this.socialSecurityNumber = profile.socialSecurityNumber ?? '';
    this.category = profile.category ?? 'ADULT';
    this.companyName = profile.companyName ?? '';
    this.allergies = profile.allergies ?? '';
    this.medicalAntecedents = profile.medicalAntecedents ?? '';
    this.currentTreatments = profile.currentTreatments ?? '';
    this.guardianId = profile.guardian?.id ?? null;
  }

  private applyDoctorProfile(profile: BackendDoctor): void {
    this.firstName = profile.user?.firstname ?? this.firstName;
    this.lastName = profile.user?.lastname ?? this.lastName;
    this.email = profile.user?.email ?? this.email;
    this.specialty = profile.specialty ?? '';
    this.bio = profile.bio ?? '';
    this.spokenLanguages = profile.spokenLanguages ?? '';
    this.standardConsultationRate = profile.standardConsultationRate ?? 300;
    this.availabilityStart = (profile.availabilityStart ?? '08:00').slice(0, 5);
    this.availabilityEnd = (profile.availabilityEnd ?? '18:00').slice(0, 5);
    this.workingDays = profile.workingDays ?? 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY';
    this.defaultSlotMinutes = profile.defaultSlotMinutes ?? 30;
  }

  saveDoctorUnavailability(): void {
    if (!this.user || !this.isDoctor) {
      return;
    }
    if (!this.unavailabilityForm.startDateTime || !this.unavailabilityForm.endDateTime) {
      this.error = 'Renseignez la période d indisponibilité.';
      return;
    }

    this.saving = true;
    this.api
      .createDoctorUnavailability(this.currentUserId, this.unavailabilityForm)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.success = 'Indisponibilité enregistrée.';
          this.error = '';
          this.unavailabilityForm = {
            startDateTime: '',
            endDateTime: '',
            reason: '',
            type: 'LEAVE',
          };
          this.loadDoctorUnavailabilities();
        },
        error: (err: { error?: { message?: string } | string }) => {
          this.success = '';
          this.error =
            typeof err.error === 'string'
              ? err.error
              : err.error?.message ?? 'Enregistrement de l indisponibilité impossible.';
        },
      });
  }

  deleteDoctorUnavailability(id: number): void {
    if (!this.isDoctor) {
      return;
    }

    this.api.deleteDoctorUnavailability(this.currentUserId, id).subscribe({
      next: () => {
        this.success = 'Indisponibilité supprimée.';
        this.error = '';
        this.loadDoctorUnavailabilities();
      },
      error: () => {
        this.success = '';
        this.error = 'Suppression de l indisponibilité impossible.';
      },
    });
  }

  formatDateTime(value: string): string {
    return new Date(value).toLocaleString('fr-MA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  get needsGuardian(): boolean {
    return this.category === 'MINOR' || this.category === 'DEPENDENT';
  }

  get selectedAppointment(): BackendAppointment | undefined {
    return this.patientAppointments.find((appointment) => appointment.id === this.feedbackForm.appointmentId);
  }

  savePatientFeedback(): void {
    if (!this.isPatient) {
      return;
    }

    const selectedAppointment = this.selectedAppointment;
    const doctorId = selectedAppointment?.doctor?.id ?? (this.feedbackForm.doctorId || undefined);
    if (!doctorId) {
      this.error = 'Sélectionnez un rendez-vous ou un médecin pour envoyer votre avis.';
      return;
    }
    if (!this.feedbackForm.title.trim() && !this.feedbackForm.message.trim()) {
      this.error = 'Ajoutez un titre ou un commentaire.';
      return;
    }

    this.saving = true;
    this.api
      .createPatientFeedback(this.currentUserId, {
        appointmentId: this.feedbackForm.appointmentId || undefined,
        doctorId,
        type: this.feedbackForm.type,
        rating: this.feedbackForm.type === 'REVIEW' ? this.feedbackForm.rating : undefined,
        title: this.feedbackForm.title,
        message: this.feedbackForm.message,
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.success = this.feedbackForm.type === 'REVIEW' ? 'Avis envoyé avec succès.' : 'Réclamation envoyée avec succès.';
          this.error = '';
          this.feedbackForm = {
            appointmentId: 0,
            doctorId: 0,
            type: 'REVIEW',
            rating: 5,
            title: '',
            message: '',
          };
          this.loadPatientFeedback();
        },
        error: (err: { error?: { message?: string } | string }) => {
          this.success = '';
          this.error =
            typeof err.error === 'string'
              ? err.error
              : err.error?.message ?? 'Envoi du feedback impossible.';
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

  private loadDoctorUnavailabilities(): void {
    this.api.getDoctorUnavailabilities(this.currentUserId).subscribe({
      next: (items) => {
        this.doctorUnavailabilities = items;
      },
      error: () => {
        this.error = 'Chargement des indisponibilités impossible.';
      },
    });
  }

  private loadPatientAppointments(): void {
    this.api.getPatientAppointments(this.currentUserId).subscribe({
      next: (items) => {
        this.patientAppointments = items.filter((appointment) => new Date(appointment.dateTime).getTime() <= Date.now());
      },
    });
  }

  private loadPatientFeedback(): void {
    this.api.getPatientFeedback(this.currentUserId).subscribe({
      next: (items) => {
        this.patientFeedback = items;
      },
    });
  }
}

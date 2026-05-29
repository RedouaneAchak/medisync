import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { AuthService, AuthUser } from '../../services/auth.service';
import { BackendDoctor, BackendPatient, MedisyncApiService } from '../../services/medisync-api.service';

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
  guardianId: number | null = null;
  specialty = '';
  bio = '';
  spokenLanguages = '';
  standardConsultationRate = 300;

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

  get isPatient(): boolean {
    return this.user?.role === 'PATIENT';
  }

  get isDoctor(): boolean {
    return this.user?.role === 'DOCTOR';
  }

  save(): void {
    this.error = '';
    this.success = '';

    if (!this.user) {
      this.error = 'Utilisateur non identifie.';
      return;
    }

    if (this.user.role === 'DOCTOR') {
      this.saveDoctorProfile(this.user);
      return;
    }

    if (this.user.role === 'PATIENT') {
      this.savePatientProfile(this.user);
      return;
    }

    this.error = 'Seuls les patients et medecins peuvent modifier ce profil ici.';
  }

  private loadProfile(): void {
    if (!this.user || (this.user.role !== 'PATIENT' && this.user.role !== 'DOCTOR')) {
      return;
    }

    this.loading = true;
    if (this.user.role === 'DOCTOR') {
      this.api
        .getDoctorProfile(this.user.userId)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: (profile) => this.applyDoctorProfile(profile),
          error: () => {
            this.error = 'Chargement du profil impossible.';
          },
        });
      return;
    }

    this.api
      .getPatientProfile(this.user.userId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (profile) => this.applyPatientProfile(profile),
        error: () => {
          this.error = 'Chargement du profil impossible.';
        },
      });
  }

  private savePatientProfile(user: AuthUser): void {
    this.saving = true;
    this.api
      .updatePatientProfile(user.userId, {
        id: user.userId,
        firstName: this.firstName,
        lastName: this.lastName,
        phoneNumber: this.phone,
        socialSecurityNumber: this.socialSecurityNumber,
        category: this.category,
        companyName: this.companyName,
        guardian: this.needsGuardian && this.guardianId ? { id: this.guardianId } : undefined,
        user: {
          id: user.userId,
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
          this.success = 'Profil patient enregistre.';
        },
        error: (err: unknown) => {
          this.error = (err as any)?.error?.message ?? 'Enregistrement impossible.';
        },
      });
  }

  private applyPatientProfile(profile: BackendPatient): void {
    this.firstName = profile.firstName ?? profile.user?.firstname ?? this.firstName;
    this.lastName = profile.lastName ?? profile.user?.lastname ?? this.lastName;
    this.phone = profile.phoneNumber ?? '';
    this.email = profile.user?.email ?? this.email;
    this.socialSecurityNumber = profile.socialSecurityNumber ?? '';
    this.category = profile.category ?? this.category;
    this.companyName = profile.companyName ?? '';
    this.guardianId = profile.guardian?.id ?? null;
  }

  private applyDoctorProfile(profile: BackendDoctor): void {
    this.specialty = profile.specialty ?? '';
    this.bio = profile.bio ?? '';
    this.spokenLanguages = profile.spokenLanguages ?? '';
    this.standardConsultationRate = profile.standardConsultationRate ?? 300;
  }

  private saveDoctorProfile(user: AuthUser): void {
    this.saving = true;
    this.api
      .updateDoctorProfile(user.userId, {
        specialty: this.specialty,
        bio: this.bio,
        spokenLanguages: this.spokenLanguages,
        standardConsultationRate: this.standardConsultationRate,
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.success = 'Profil medecin enregistre.';
        },
        error: (err: unknown) => {
          this.error = (err as any)?.error?.message ?? 'Enregistrement impossible.';
        },
      });
  }

  get needsGuardian(): boolean {
    return this.category === 'MINOR' || this.category === 'DEPENDENT';
  }
}

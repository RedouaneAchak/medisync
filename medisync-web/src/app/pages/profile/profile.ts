import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';

import { AuthService, AuthUser } from '../../services/auth.service';
import { MedisyncApiService, BackendPatient } from '../../services/medisync-api.service';


@Component({
  selector: 'app-profile',
  imports: [CommonModule, FormsModule], standalone: true,
  templateUrl: './profile.html',
})
export class Profile {
  name = '';
  phone = '';
  email = '';

  saving = false;
  error = '';

  private user: AuthUser | null = null;
  private patientId: number | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly api: MedisyncApiService,
  ) {
    this.user = this.authService.currentUser();
    if (this.user) {
      this.name = `${this.user.firstname} ${this.user.lastname}`.trim();
      this.email = this.user.email;
      this.patientId = this.user.userId;


    }
  }

  save(): void {
    console.log('Saving profile with name:', this.name, 'email:', this.email, 'phone:', this.phone);
    this.error = '';
    // show feedback in UI

    if (!this.patientId) {
      this.error = 'Utilisateur non identifie.';
      return;
    }
this.saving = true;

    // Use the spread operator (...) to grab all existing data (email, password hash, role, etc.)
    // Then, overwrite just the fields they updated in the UI.
    const payload: BackendPatient = {
      ...this.user, // Copies all hidden/required fields so they don't get erased
      id: this.patientId,
      firstname: this.name.split(' ')[0] || '',
      lastname: this.name.split(' ').slice(1).join(' ') || '',
      email: this.email, 
      phoneNumber: this.phone,
    } as BackendPatient;

    this.api
      .updatePatientProfile(this.patientId, payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.error = 'Données enregistrées.';
        },

        error: (err: unknown) => {
          this.error = (err as any)?.error?.message ?? 'Enregistrement impossible.';
        },
      });

  }
}


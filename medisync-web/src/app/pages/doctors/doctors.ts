import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Doctor, doctors } from '../../data/medisync-data';
import { BackendDoctor, MedisyncApiService } from '../../services/medisync-api.service';

@Component({
  selector: 'app-doctors',
  imports: [FormsModule, RouterLink],
  templateUrl: './doctors.html',
})
export class Doctors {
  doctors = doctors;
  query = '';
  specialty = 'Tous';
  loading = false;
  error = '';

  specialties = ['Tous', ...new Set(doctors.map((doctor) => doctor.specialty))];

  constructor(private readonly api: MedisyncApiService) {
    this.loadDoctors();
  }

  get filteredDoctors() {
    const query = this.query.toLowerCase().trim();
    return this.doctors.filter((doctor) => {
      const matchesSpecialty = this.specialty === 'Tous' || doctor.specialty === this.specialty;
      const matchesQuery = [doctor.name, doctor.specialty, doctor.city, doctor.clinic]
        .join(' ')
        .toLowerCase()
        .includes(query);
      return matchesSpecialty && matchesQuery;
    });
  }

  private loadDoctors(): void {
    this.loading = true;
    this.api.getDoctors().subscribe({
      next: (items) => {
        if (items.length) {
          this.doctors = items.map((doctor) => this.toDoctorCard(doctor));
          this.specialties = ['Tous', ...new Set(this.doctors.map((doctor) => doctor.specialty))];
        }
        this.loading = false;
      },
      error: () => {
        this.error = 'Connectez-vous pour charger les medecins depuis le backend.';
        this.loading = false;
      },
    });
  }

  private toDoctorCard(doctor: BackendDoctor): Doctor {
    const firstname = doctor.user?.firstname ?? 'Dr.';
    const lastname = doctor.user?.lastname ?? `#${doctor.id}`;
    const name = `${firstname} ${lastname}`.startsWith('Dr.') ? `${firstname} ${lastname}` : `Dr. ${firstname} ${lastname}`;
    return {
      id: doctor.id,
      name,
      specialty: doctor.specialty ?? 'Medecine generale',
      city: 'Casablanca',
      clinic: 'MediSync',
      languages: doctor.spokenLanguages ?? 'Francais, Arabe',
      rating: 4.7,
      price: doctor.standardConsultationRate ?? 300,
      nextSlot: 'Voir disponibilites',
      available: true,
      initials: `${firstname[0] ?? 'M'}${lastname[0] ?? 'D'}`.toUpperCase(),
    };
  }
}
